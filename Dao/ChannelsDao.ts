let connection: any

export default class ChannelDAO {
    
    static async injectDB(conn: any) {
        if(connection) {
            return
        }
        try{
            connection = conn
        } catch (e) {
            console.error(
                `Unable to establish a collection handle in channelsDAO`
            )
        } 
    }

    static async createChannel(userId: number, name: string) {
        try{
            await connection.query('BEGIN')
            const queryText = `INSERT INTO channel (name) VALUES ('${name}') RETURNING *`
            const channel = await connection.query(queryText)
            const userChannel = await connection.query(`INSERT INTO channel_user (user_id, channel_id, is_owner_of_channel, can_invite) 
            VALUES ('${userId}', '${channel.rows[0].id}', 'true', 'true') RETURNING *`)

            await connection.query('COMMIT')
            
            return {channel: channel.rows[0], userChannel: userChannel.rows[0] }
        } catch (e) {
            await connection.query('ROLLBACK')
            console.error(e)
            return({error: e})
        } 
    }

    static async isOwnerOfTheChannel(userId: number, channelId: number) {
        try{
            const userChannel = await connection.query(`SELECT * FROM channel_user 
                WHERE channel_id='${channelId}' And user_id='${userId}'`)

            if(userChannel.rowCount===0 || userChannel.rows[0].is_owner_of_channel===false) return {isOwner: false}
            return {isOwner: true}
        } catch (e) {
            console.error(e)
            return({error: e})
        } 
    }

    static async deleteChannel(channelId: number) {
        try{
            let deletedChannel = await connection.query(`DELETE FROM channel WHERE id='${channelId}'`)
            if(deletedChannel.rowCount===0) return {error: "Unable to delete channel" }
            return 
        } catch (e) {
            console.error(e)
            return({error: e})
        } 
    }

    static async addUserToChannel(userId: number, channelId: number) {
        try{
            let userChannel = await connection.query(`INSERT INTO channel_user (user_id, channel_id) 
            VALUES ('${userId}', '${channelId}')`)
            if(userChannel.rowCount===1) return true
            return false
        } catch (e) {
            console.error(e)
            return({error: e})
        } 
    }

    static async removeUserFromChannel(userId: number, channelId: number) {
        try{
            
            await connection.query('BEGIN')
            const queryText = `DELETE FROM channel_user WHERE user_id = '${userId}' AND channel_id = '${channelId}' RETURNING *`
            const res = await connection.query(queryText)
            
            const user_ = await connection.query(`SELECT * FROM channel_user 
                WHERE channel_id='${channelId}'
                ORDER BY join_date;`)

            if(user_.rows.length===0){
                await connection.query(`DELETE FROM channel WHERE id = '${channelId}';`)
            }
            else if(res.rows[0].is_owner_of_channel === true){
                await connection.query(`UPDATE channel_user SET is_owner_of_channel = 'true'
                WHERE user_id = '${user_.rows[0].user_id}' AND channel_id = '${channelId}';`)
            }
            
            await connection.query('COMMIT')
    
            return{success: true}
        } catch (e) {
            console.error(e)
            await connection.query('ROLLBACK')
            return({error: e})
        } 
    }

    static async changeUserAbilityToInvite(userId: number, channelId: number, allowInvite: boolean) {
        try{
            await connection.query(`UPDATE channel_user SET can_invite = '${allowInvite}' 
                WHERE user_id = '${userId}' AND channel_id = '${channelId}'`)
            return
        } catch (e) {
            console.error(e)
            return({error: e})
        } 
    }

    static async checkIfUserInChannel(userId: number, channelId: number) {
        try{
            let channel = await connection.query(`SELECT * FROM channel_user WHERE 
                user_id='${userId}' AND channel_id='${channelId}';`)
            if(channel.rowCount===0) return {isUserInChannel: false}
            return {isUserInChannel: true}
        } catch (e) {
            console.error(e)
            return({error: e})
        } 
    }

    static async canUserSendInvitesInThisChannel(userId: number, channelId: number) {
        try{
            let channel = await connection.query(`SELECT * FROM channel_user WHERE 
                user_id='${userId}' AND channel_id='${channelId}'`)
            if(channel.rowCount===0) return {canSend: false}
            if(!channel.rows[0].can_invite && !channel.rows[0].is_owner_of_channel) return {canSend: false}
            return {canSend: true}
        } catch (e) {
            console.error(e)
            return({error: e})
        } 
    }

    static async canUserRemoveUserFromChannel(userId: number, channelId: number) {
        try{
            let channel = await connection.query(`SELECT * FROM channel_user WHERE 
                user_id='${userId}' AND channel_id='${channelId}'`)
            if(channel.rowCount===0) return {canRemove: false}
            if(!channel.rows[0].is_owner_of_channel) return {canRemove: false}
            return {canRemove: true}
        } catch (e) {
            console.error(e)
            return({error: e})
        } 
    }

    static async getUserChannels(userId: number) {
        try{
            let userChannels = await connection.query(`SELECT * 
            FROM channel_user LEFT JOIN channel ON (channel_user.channel_id = channel.id) WHERE user_id = '${userId}'`)
            return {success: true, userChannels: userChannels.rows}
        } catch (e) {
            console.error(e)
            return({error: e, success: false})
        } 
    }

    static async getChannelData(channelId: number) {
        try{
            let channelMembers = await connection.query(`SELECT channel_id, is_owner_of_channel, can_invite, channel_user.join_date, id, 
            username, last_message_seen_id
            FROM channel_user 
            LEFT JOIN user_ ON (channel_user.user_id = user_.id) WHERE channel_id = '${channelId}'`)
            let channelInfo = await await connection.query(`Select * From channel WHERE id = '${channelId}'`)
            return {channelMembers: channelMembers.rows, channelInfo: channelInfo.rows}
        } catch (e) {
            console.error({channelError:e})
            return({error: e})
        } 
    }

    static async getAllUserIdsInChannel(channelId: number) {
        try{
            let channelMembers = await connection.query(`SELECT user_id FROM channel_user WHERE channel_id = '${channelId}'`)
            return {channelMembers: channelMembers.rows}
        } catch (e) {
            console.error(e)
            return({error: e, success: false})
        } 
    }

    static async markLastMessageSeenByUserInChannel(channelId: number, messageId: number, userId: number) {
        try{
            
            await connection.query(`UPDATE channel_user SET last_message_seen_id  = '${messageId}'
                WHERE channel_id='${channelId}' AND user_id='${userId}' RETURNING *`)
            return {success: true}
        } catch (e) {
            console.error(e)
            return({error: e})
        } 
    }


}