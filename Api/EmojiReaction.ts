import EmojiReactionDAO from '../Dao/EmojiReactionDao';
import {  Response, NextFunction } from 'express';
import { IGetUserAuthInfoRequest } from '../types/types';
import {EmojiReaction} from "../types/types"
import { io } from "..";

export default class EmojiReactionCtrl {
    
    static async apiAddEmojiReactionToMessage(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            if(!req.user) return res.status(403)
            
            
            if( req.query.emoji === undefined) return res.status(400).json({error: "missing emoji"})
           
            const emojiReaction: EmojiReaction = req.query.emoji as EmojiReaction
            const messageId = parseInt(req.params.id)

            if(isNaN(messageId)) return res.status(500).json({error: "Missing message id in param"})
            if(Object.values(EmojiReaction).includes(emojiReaction)) return res.status(500).json({error: "Unsupported data for emoji field"})
            // sanitized in middleware
            // deepcode ignore Sqli: <sanitized in middleware>
            let response = await EmojiReactionDAO.addEmojiReactionToMessage(emojiReaction, req.user.id, messageId)  

            if(response.error) return res.status(500).json({error: "Unexpected error"}) 

            io.to("11").emit("add-emoji", emojiReaction, {username: req.user.username,userId: req.user.id}, messageId)
            //io.to(response.message.channel_id.toString()).emit("delete-message", 
            //    messageId)
            return res.status(201).json({status: "success"})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
        }
    }


    static async apiRemoveEmoji(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            if(!req.user) return res.status(403)
            if( req.query.emoji === undefined) return res.status(400).json({error: "missing emoji"})

            const emojiReaction: EmojiReaction = req.query.emoji as EmojiReaction
            const messageId = parseInt(req.params.id)

            if(isNaN(messageId)) return res.status(500).json({error: "Missing message id in param"})
            if(Object.values(EmojiReaction).includes(emojiReaction)) return res.status(500).json({error: "Unsupported data for emoji field"})
            
            let response = await EmojiReactionDAO.removeEmojiReactionFromMessage(emojiReaction, req.user.id, messageId)  

            if(response.error) return res.status(500).json({error: "Unexpected error"}) 

            io.to("11").emit("delete-emoji", emojiReaction, req.user.id, messageId)
            //io.to(response.message.channel_id.toString()).emit("delete-message", 
            //    messageId)
            return res.status(201).json({status: "success"})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
        }
    }
}