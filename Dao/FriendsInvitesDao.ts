let connection: any

export default class FriendInviteDao {
    
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

    static async createFriendInvite(user_inviting_id: number, user_invited_id: number) {
        try{
            let invite = await connection.query(`INSERT INTO friend_invite (user_inviting_id, user_invited_id) 
                VALUES ('${user_inviting_id}', '${user_invited_id}') RETURNING *`)

            return {success: true, invite: invite.rows[0]}
        } catch (e) {
            console.log(e)
            return({error: e})
        } 
    }

    static async deleteFriendInvite(inviteId: number, userId: number) {
        try{
            let invite = await connection.query(`DELETE FROM friend_invite 
                WHERE (id='${inviteId}' AND (user_invited_id='${userId}' OR user_inviting_id='${userId}'))`)
            return {success: true, invite: invite}
        } catch (e) {
            console.log(e)
            return({error: e})
        } 
    }

    static async acceptFriendInvite(inviteId: number, userId: number) {
        try{
            await connection.query('BEGIN')
            const queryText = `DELETE FROM friend_invite WHERE (id = '${inviteId}' AND user_invited_id = '${userId}') RETURNING *`
            
            const res = await connection.query(queryText)
            if(res.rowCount === 0) {
                await connection.query('ROLLBACK')
                return {error: "Invite Doesn't Exist"}
            }

            const friendship = await connection.query(`
            WITH friendShip As(
            INSERT INTO friend (user_one_id, user_two_id) 
            VALUES ( '${res.rows[0].user_inviting_id}', '${userId}') 
            RETURNING *)
            SELECT friendShip.user_one_id, friendShip.user_two_id, friendShip.start_of_friendship, 
            user_one.username As username_one , user_two.username As username_two
            FROM friendShip 
            LEFT JOIN user_ as user_one ON (friendShip.user_one_id = user_one.id) 
            LEFT JOIN user_ as user_two ON (friendShip.user_two_id = user_two.id)`)
              
            await connection.query('COMMIT')

            return {friendship: friendship.rows[0]}
        } catch (e) {
            console.log(e)
            return({error: e})
        } 
    }



    static async getFriendShipInvites(userId: number) {
        try{
            const queryText = `SELECT user_inviting_id, user_invited_id, invite_date, username, seen_by_user_invited, friend_invite.id
                FROM friend_invite 
                LEFT JOIN user_ ON (friend_invite.user_inviting_id = user_.id) 
                WHERE user_invited_id = ${userId}`
            const res = await connection.query(queryText)
            
            return {invites: res.rows}
        } catch (e) {
            console.log(e)
            return({error: e})
        } 
    }

    static async getFriendShipInvitesSentByUser(userId: number) {
        try{
            const queryText = `SELECT user_inviting_id, user_invited_id, invite_date, username, seen_by_user_invited, friend_invite.id
                FROM friend_invite 
                LEFT JOIN user_ ON (friend_invite.user_invited_id = user_.id) 
                WHERE user_inviting_id = ${userId}`
            const res = await connection.query(queryText)
            
            return {invites: res.rows}
        } catch (e) {
            console.log(e)
            return({error: e})
        } 
    }

    static async markInviteAsSeen(inviteId: number, userId: number) {
        try{

            const res = await connection.query(`UPDATE friend_invite SET seen_by_user_invited = '${true}' 
            WHERE id  = '${inviteId}' AND user_invited_id = '${userId}'`)
            
            if(res.rowCount === 0) return {error: "Invite Doesn't Exist"}
  
            return 
        } catch (e) {
            console.error(e)
            return({error: e})
        } 
    }
 
}