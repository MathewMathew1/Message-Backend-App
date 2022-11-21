import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

let connection: any

export default class AuthenticationDAO {
    
    static async injectDB(conn: any) {
        if(connection) {
            return
        }
        try{
            connection = conn
        } catch (e) {
            console.error(
                `Unable to establish a collection handle in authDAO`
            )
        } 
    }

    static async createUser(password: string, username: string) {
        try{
            let user = await connection.query(`INSERT INTO user_ (username, password) VALUES ('${username}', '${password}')`)
            return {success: true, user: user}
        } catch (e) {
            console.log(e)
            return({error: e})
        } 
    }

    static async validateUser(password: string, username: string) {
        try{
            let user = await connection.query(`SELECT * FROM user_ WHERE username='${username}'`)
            user = user.rows[0]
            if(await bcrypt.compare(password, user.password)) return {id: user.id.toString()}
            return {error: "invalid password"}  
        } catch (e) {
            console.log(e)
            return({error: e})
        } 
    }

    static async setUser(token: string){
        try{
            if(!process.env.ACCESS_TOKEN_SECRET) return
           
            let id = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

            const userDb = await connection.query(`SELECT * FROM user_ WHERE id='${id}'`)
            return userDb.rows[0]
        } 
        catch(e){
            return {error: e}
        } 
    }

    static async userData(userId: number){
        try{
            let user = await connection.query(`SELECT username, id, join_date FROM user_ WHERE id = ${userId}`)
            user = user.rows[0]
            return {user: user}
        } 
        catch(e){
            console.log(e)
            return {error: e}
        } 
    }

    static async validatePassword(password: string, id: string) {
        try{
            let user = await connection.query(`SELECT * FROM user_ WHERE id='${id}'`)
            user = user.rows[0]
            if(await bcrypt.compare(password, user.password)) return {correctPassword: true}
            return {correctPassword: false}  
        } catch (e) {
            console.log(e)
            return({error: e})
        } 
    }

    static async changePassword(password: string, id: string) {
        try{
            let changePassword = await connection.query(`UPDATE user_ SET password = '${password}'
            WHERE id='${id}'`)

            if(changePassword.rowCount === 0) return {error: "unable to update password"}
            return 
        } catch (e) {
            console.log(e)
            return({error: e})
        } 
    }
    

    
}