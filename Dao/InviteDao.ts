
let connection: any

export default class InviteDAO {
    
    static async injectDB(conn: any) {
        if(connection) {
            return
        }
        try{
            connection = conn
        } catch (e) {
            console.error(
                `Unable to establish a collection handle in inviteDAO`
            )
        } 
    }

    static async createInvite(channelId: number, userInvitingId: number, userInvitedId: number) {
        try{
            let invite = await connection.query(`WITH inserted_invite As ( INSERT INTO invite (user_invited_id, user_inviting_id, channel_id) 
                VALUES ('${userInvitedId}', '${userInvitingId}', '${channelId}') RETURNING *)
                SELECT inserted_invite.id, user_invited_id, user_inviting_id, channel_id, seen_by_user_invited, name AS channel_name,
                date_of_creation, username, 
                (SELECT COUNT(*) FROM channel_user WHERE inserted_invite.channel_id = channel_user.channel_id) AS member_count
                FROM inserted_invite 
                LEFT JOIN channel ON (inserted_invite.channel_id = channel.id) 
                LEFT JOIN user_ ON (inserted_invite.user_inviting_id = user_.id)`)
            return {invite: invite.rows[0]}
        } catch (e) {
            console.error(e)
            return({error: e})
        } 
    }

    static async acceptInvites(idOfInvite: number, userInvitedId: number) {
        try{

            await connection.query('BEGIN')
            const queryText = `DELETE FROM invite WHERE id = '${idOfInvite}' AND user_invited_id = '${userInvitedId}' RETURNING *`
            
            const res = await connection.query(queryText)
            if(res.rowCount === 0) {
                await connection.query('ROLLBACK')
                return {invite: "Invite Doesn't Exist"}
            }

            let channelUser = await connection.query(`INSERT INTO channel_user (user_id, channel_id) 
            VALUES ('${userInvitedId}', '${res.rows[0].channel_id}') RETURNING *`)

            let channel = await connection.query(`SELECT * FROM channel_user 
                LEFT JOIN channel ON (channel_user.channel_id = channel.id) 
                WHERE user_id = '${userInvitedId}' AND channel_id ='${channelUser.rows[0].channel_id}'`)
              
            await connection.query('COMMIT')

            return {channelUser: channelUser.rows[0], channel: channel.rows[0]}
        } catch (e) {
            console.error(e)
            await connection.query('ROLLBACK')
            return({error: e})
        } 
    }

    static async deleteInvite(idOfInvite: number, userId: number) {
        try{

            const invite = await connection.query(`DELETE FROM invite WHERE (id = ${idOfInvite} 
                AND (user_invited_id = '${userId}' OR user_inviting_id = '${userId}')) RETURNING *`)
         
            if(invite.rowCount === 0) return {error: "Invite Doesn't Exist"}
  
            return {invite: invite.rows[0]}
        } catch (e) {
            console.error(e)
            return({success: false, error: e})
        } 
    }

    static async markInviteAsSeen(idOfInvite: number, userInvitedId: number) {
        try{

            const queryText = `UPDATE invite SET seen_by_user_invited = '${true}' 
            WHERE id = '${idOfInvite}' AND user_invited_id = '${userInvitedId}'`
            const res = await connection.query(queryText)
            if(res.rowCount === 0) return {error: "Invite Doesn't Exist"}
  
            return 
        } catch (e) {
            console.error(e)
            return({error: e})
        } 
    }

    static async getAllUserInvites(userId: number) {
        try{

            const queryText = `SELECT invite.id, user_invited_id, user_inviting_id, channel_id, seen_by_user_invited, name AS channel_name,
                date_of_creation, username, 
                (SELECT COUNT(*) FROM channel_user WHERE invite.channel_id = channel_user.channel_id) AS member_count
                FROM invite 
                LEFT JOIN channel ON (invite.channel_id = channel.id) 
                LEFT JOIN user_ ON (invite.user_inviting_id = user_.id)
                WHERE user_invited_id = ${userId}`
            const res = await connection.query(queryText)
            
            return {success: true, invites: res.rows}
        } catch (e) {
            console.error(e)
            return({success: false, error: e})
        } 
    }

    static async getInvitesSentByUser(userId: number) {
        try{
            const queryText = `SELECT invite.id, user_invited_id, user_inviting_id, channel_id, seen_by_user_invited, name AS channel_name,
                date_of_creation, username, 
                (SELECT COUNT(*) FROM channel_user WHERE invite.channel_id = channel_user.channel_id) AS member_count
                FROM invite
                LEFT JOIN channel ON (invite.channel_id = channel.id) 
                LEFT JOIN user_ ON (invite.user_invited_id = user_.id)
                WHERE user_inviting_id = ${userId}`
            const res = await connection.query(queryText)
            
            return {success: true, invites: res.rows}
        } catch (e) {
            console.error(e)
            return({success: false, error: e})
        } 
    }

}