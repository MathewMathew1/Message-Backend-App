import express from 'express'
import { Pool } from 'pg'
import router from './Api/route'
import AuthenticationDAO from './Dao/AuthenticationDao'
import MessageDAO from './Dao/MessageDao'
import ChannelDAO from './Dao/ChannelsDao'
import InviteDAO from './Dao/InviteDao'
import EmojiReactionDAO from './Dao/EmojiReactionDao'
import bodyParser from 'body-parser'
import { Server } from "socket.io";
import cors from "cors"
import dotenv from "dotenv"
import { instrument } from "@socket.io/admin-ui"
import FriendDao from './Dao/FriendsDao'
import FriendInviteDao from './Dao/FriendsInvitesDao'
import { FriendUser } from './types/types'

const app = express()
const PORT = process.env.PORT || 8000 
app.use(express.json())
app.use(bodyParser.json())
let env = process.env.NODE_ENV || 'development';
if(env==='development'){
  app.use(cors({origin: ["http://localhost:3000","https://socket.io"]}))
}
else{
  app.use(cors({origin: ["https://socket.io", "https://main--oliphant.netlify.app"]}))
}

dotenv.config()

app.use("/api/v1/", router)
app.use("*", (_req, res) => res.status(404).json({error: "Not found"}))


const server = app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
});


const io = new Server(server, {
  cors: {
    origin: env==='development'? ["http://localhost:3000","https://admin.socket.io"]:  ["https://main--oliphant.netlify.app","https://admin.socket.io"]
  }
})

io.use(async function(socket, next){
  
  if (socket.handshake.query && socket.handshake.query.token){
    if(typeof socket.handshake.query.token !== "string") return
    
    const token: string = socket.handshake.query.token.split(' ')[1]
    let user= await AuthenticationDAO.setUser(token) 

    if (!user|| user.error) return next(new Error('Authentication error'));
      user.id = parseInt(user.id)
      socket.user = user
      
      let friends = await FriendDao.getUserFriendships(user.id)
      let socketsOfFriendUsers: string[] = []
            
      io.sockets.sockets.forEach(function(data,_counter){
        if(data.user.id===user.id) return

        const index = friends.friendships.findIndex((obj: FriendUser) => 
          {return parseInt(obj.user_one_id) === data.user.id || parseInt(obj.user_two_id) === data.user.id})
        if(index===-1) return

        socketsOfFriendUsers.push(data.id)
          
      })
      if(socketsOfFriendUsers.length!==0) {
        io.to(socketsOfFriendUsers).emit("friend-status-changed", {userId: user.id, isOnline: true})
      }

      next();
  }
  else {
    next(new Error('Authentication error'));
  }    
  })
  .on("connection", (socket: any) => {
    socket.on("join-chatroom", (room: string) => {
      if(isNaN(parseInt(room))){
        return 
      }
      const joinRoom = async () => {

        let response = await ChannelDAO.checkIfUserInChannel(parseInt(socket.user.id), parseInt(room))

        if(response.isUserInChannel) socket.join(room)
      }

      joinRoom()
      
    })

    socket.on("leave-chatroom", (room: string) => { 
      const leaveRoom = async () => {
        socket.leave(room)
      }

      leaveRoom()
    })
  
    socket.on("disconnect", (reason: any) => {

      const notifyFriendAboutDisconnection = async () => {
        let friends = await FriendDao.getUserFriendships(socket.user.id)
        let socketsOfFriendUsers: string[] = []
        let areThereAnyOtherSocketsOfDisconnectingUser = false
              
        io.sockets.sockets.forEach(function(data,_counter){
          if(areThereAnyOtherSocketsOfDisconnectingUser) return
          
          if(data.user.id=== socket.user.id) {
            areThereAnyOtherSocketsOfDisconnectingUser = true
            return 
          }  

          const index = friends.friendships.findIndex((obj: FriendUser) => 
            {return parseInt(obj.user_one_id) === data.user.id || parseInt(obj.user_two_id) === data.user.id})
          if(index===-1) return

          socketsOfFriendUsers.push(data.id)
          return true
        })
        if(socketsOfFriendUsers.length!==0 && !areThereAnyOtherSocketsOfDisconnectingUser) {
          io.to(socketsOfFriendUsers).emit("friend-status-changed", {userId: socket.user.id, isOnline: false})
        }
    }

    notifyFriendAboutDisconnection()  

  });
});

const host = env==='development'? 'localhost': "containers-us-west-114.railway.app"
const port = env==='development'? 5432: 7122
const database = env==='development'? "MessageApp" : "railway"

const connection = {
  user: process.env.POSTGRESQL_USER, 
  database: database, 
  password: process.env.POSTGRESQL_PASSWORD, 
  host: host, 
  port: port, 
  max: 10, // max number of clients in the pool
  idleTimeoutMillis: 30000,
}

const dbConnection = new Pool(connection)
console.log(dbConnection)
AuthenticationDAO.injectDB(dbConnection)
MessageDAO.injectDB(dbConnection)
ChannelDAO.injectDB(dbConnection)
InviteDAO.injectDB(dbConnection)
EmojiReactionDAO.injectDB(dbConnection)
FriendDao.injectDB(dbConnection)
FriendInviteDao.injectDB(dbConnection)

instrument(io, {auth: false})

export {io}
