import {EmojiReaction} from "../types/types"

let connection: any

export default class EmojiReactionDAO {
    
    static async injectDB(conn: any) {
        if(connection) {
            return
        }
        try{
            connection = conn
        } catch (e) {
            console.error(
                `Unable to establish a collection handle in EmojiReactionDao`
            )
        } 
    }

    static async addEmojiReactionToMessage(emoji: EmojiReaction, userId: number, messageId: number) {
        try{
            let emojiReactionByUser = await connection.query(`
                INSERT INTO emoji_reaction_to_message
                (user_id, message_id, emoji_reaction) 
                VALUES ('${userId}', '${messageId}', '${emoji}'::emojireaction_type);    
            `)

            return {emojiReactionByUser}

        } catch (e) {
            console.error(e)
            return({error: e})
        } 
    }

    static async removeEmojiReactionFromMessage(emoji: EmojiReaction, userId: number, messageId: number) {
        try{
            let emojiReactionByUser = await connection.query(`             
                DELETE FROM emoji_reaction_to_message
                WHERE user_id='${userId}' AND message_id='${messageId}' AND emoji_reaction='${emoji}';
            `)


            return {emojiReactionByUser}

        } catch (e) {
            console.error(e)
            return({error: e})
        } 
    }

}