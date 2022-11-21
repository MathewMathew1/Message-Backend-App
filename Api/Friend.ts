import { Response, NextFunction } from 'express';
import { FriendUser, IGetUserAuthInfoRequest } from '../types/types';
import { io } from "..";
import FriendDao from "../Dao/FriendsDao";

export default class FriendCtrl {
    
    static async apiGetUserFriendships(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            if(!req.user) return res.status(403)

            let response = await FriendDao.getUserFriendships(req.user.id)
            if( response.error ) return res.status(500).json({error: "Unable to find friendships"})
       
            let friendships: FriendUser[] = response.friendships

            for(let i=0; i<friendships.length; i++){
                friendships[i].isOnline = false
            }

            io.sockets.sockets.forEach(function(data,_counter){
                if(data.user.id===req.user?.id) return

                const index = friendships.findIndex((obj: FriendUser) => 
                    {return parseInt(obj.user_one_id) === data.user.id || parseInt(obj.user_two_id) === data.user.id})
                
                if(index===-1) return

                friendships[index].isOnline = true
                
            })

            return res.status(201).json({friendships})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
          }
    }

    static async apiRemoveUserFriendships(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            if(!req.user) return res.status(403)

            const friendId = parseInt(req.params.friendId)

            if(isNaN(friendId)) return res.status(500).json({error: "Missing friend id in param"})

            let friendships = await FriendDao.endFriendship(req.user.id, friendId)
            if( friendships?.error ) return res.status(500).json({error: "Unable to finish friendship"})

            let socketsOfFriendship: string[] = []
            io.sockets.sockets.forEach(function(data,_counter){
                
                if(data.user.id === friendId || data.user.id === req.user?.id){
                    socketsOfFriendship.push(data.id)
                }
                
            })
            if(socketsOfFriendship.length!==0) {
                io.to(socketsOfFriendship).emit("friendship_ended", {userEndingFriendshipId :req.user.id, friendId})
            }

            return res.status(201).json({status: "success"})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
          }
    }

    

}