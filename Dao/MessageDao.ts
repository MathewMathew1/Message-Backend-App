
let connection: any

export default class MessageDAO {
    
    static async injectDB(conn: any) {
        if(connection) {
            return
        }
        try{
            connection = conn
        } catch (e) {
            console.error(
                `Unable to establish a collection handle in messageDAO`
            )
        } 
    }

    static async sendMessage(messageText: string, userId: number, channelId: number) {
        try{

            let message = await connection.query(`INSERT INTO message (message_text, user_of_message, channel_id) 
                VALUES ('${messageText}', '${userId}', '${channelId}') RETURNING channel_id, date_of_posting, edited_on,  
                user_of_message  AS user_id, message_text`)
            return {success: true, message: message.rows[0]}
        } catch (e) {
            console.error(e)
            return({success: false, error: e})
        } 
    }

    static async getChannelMessages(channelId: number) {
        try{
            let messages = await connection.query(`(SELECT message.channel_id, message.date_of_posting, message.edited_on, 
                message.id, message_text, 
                user_of_message AS user_id, user_.username,
                array_agg(json_build_object('emoji', emoji_reaction_to_message.emoji_reaction, 'user_id',  
                emoji_reaction_to_message.user_id, 'username', userOfEmoji.username)) As emojis 
                FROM message
                LEFT JOIN user_ ON (message.user_of_message = user_.id) 
                LEFT JOIN emoji_reaction_to_message ON (message.id = emoji_reaction_to_message.message_id) 
                LEFT JOIN user_ AS userOfEmoji ON (emoji_reaction_to_message.user_id = userOfEmoji.id) 
                WHERE channel_Id='${channelId}'
                GROUP BY 
                    message.channel_id, 
                    message.date_of_posting, 
                    message.edited_on, 
                    message.id,
                    user_.username
                )
                ORDER BY id ASC`)
  
            return {success: true, messages: messages.rows}
        } catch (e) {
            console.error(e)
            return({success: false, error: e})
        } 
    }

    static async deleteMessage(messageId: number) {
        try{
            let message = await connection.query(`DELETE FROM message WHERE id='${messageId}' RETURNING channel_id`)
            if(message.rowCount === 0) return {success: false, message: "Message Doesn't Exist"}
            return {success: true, message: message.rows[0]}
        } catch (e) {
            console.error(e)
            return({success: false, error: e})
        } 
    }

    static async editMessage(messageId: number, messageText: string) {
        try{
            let message = await connection.query(`UPDATE message SET edited_on = NOW(),
                message_text = '${messageText}'  
                WHERE id='${messageId}' RETURNING *`)
            
            if(message.rowCount === 0) return {success: false, message: "Unable to edit message"}
            return {success: true, message: message.rows[0]}
        } catch (e) {
            console.error(e)
            return({success: false, error: e})
        } 
    }

    static async canUserDeleteMessage(messageId: number, userId: number) {
        try{
            let message = await connection.query(`SELECT * FROM message WHERE 
                id = '${messageId}'`)
            
            if(message.rowCount === 0 ) return {canDelete: false, explanation: "Message not found", codeError: 404}
            
            if(message.rows[0].user_of_message === userId) return {canDelete: true, explanation: "", codeError: 201}
            let userPermissionInMessageChannel = await connection.query(`SELECT * FROM channel_user WHERE 
                user_id='${userId}' AND channel_id='${message.rows[0].channel_id}'`)

            if(userPermissionInMessageChannel.rows[0].is_owner_of_channel) return {canDelete: true, explanation: "", codeError: 201}
            return {canDelete: false, explanation: "You need to be either owner of channel or user who send message to delete", 
                codeError: 403}

        } catch (e) {
            console.error(e)
            return({error: e})
        } 
    }

    static async canUserEditMessage(messageId: number, userId: number) {
        try{
            let message = await connection.query(`SELECT * FROM message WHERE 
                id = '${messageId}'`)
            
            if(message.rowCount === 0 ) return {canEdit: false, explanation: "Message doesn't exist", codeError: 404}
            
            if(message.rows[0].user_of_message === userId) return {canEdit: true, explanation: "", codeError: 201}
            return {canEdit: false, explanation: "Only person who send message can edit it", codeError: 403}

        } catch (e) {
            console.error(e)
            return({error: e})
        } 
    }

}