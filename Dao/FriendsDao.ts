let connection: any

export default class FriendDao {
    
    static async injectDB(conn: any) {
        if(connection) {
            return
        }
        try{
            connection = conn
        } catch (e) {
            console.error(
                `Unable to establish a collection handle in friendDAO`
            )
        } 
    }

    static async getUserFriendships(userId: number) {
        try{
            const res = await connection.query(`
                SELECT user_one_id, user_two_id, start_of_friendship, username
                FROM friend 
                LEFT JOIN user_ ON 
                (friend.user_two_id !='${userId}' AND friend.user_two_id = user_.id)
                OR 
                (friend.user_one_id !='${userId}' AND friend.user_one_id = user_.id)
                
                WHERE user_one_id = '${userId}' OR user_two_id = '${userId}'`)
            
            return {friendships: res.rows}
        } catch (e) {
            console.log(e)
            return({error: e})
        } 
    }

    static async endFriendship(userId: number, userRemovedId: number) {
        try{
            await connection.query(`DELETE FROM friend 
                WHERE (user_one_id = '${userId}' AND user_two_id = '${userRemovedId}')
                OR (user_one_id = '${userRemovedId}' AND user_two_id = '${userId}')`)
            return 
        } catch (e) {
            console.log(e)
            return({error: e})
        } 
    }

    static async checkIfFriendshipBetweenTwoUsersExist(user_inviting_id: number, user_invited_id: number) {
        try{
            let invite = await connection.query(`SELECT * FROM friend WHERE 
                (user_one_id = '${user_inviting_id}'AND user_two_id='${user_invited_id}') 
                OR (user_two_id = '${user_inviting_id}'
                AND user_one_id='${user_invited_id}') `)
            if(invite.rowCount===0) return ({friendShipExist: false})
            return ({friendShipExist: true})
        } catch (e) {
            console.log(e)
            return({error: e})
        } 
    }
 
}