import MessageDao from "../Dao/MessageDao";
import { Response, NextFunction } from 'express';
import { IGetUserAuthInfoRequest } from '../types/types';
import { validationResult } from 'express-validator'
import { io } from "..";
import { Message } from "../types/types";

export default class MessageCtrl {
    static async apiSendMessage(req: IGetUserAuthInfoRequest, res: Response, _next: NextFunction){
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array() });
            }

            if(!req.user) return res.status(403)

            const message: string = req.body.message
            const channelId: number = parseInt(req.params.id)

            if(isNaN(channelId)) return res.status(500).json({error: "Missing channel id in param"})

            
            // deepcode ignore Sqli: <sanatized in middleware>
            let response = await MessageDao.sendMessage(message, req.user.id, channelId)

            if(response.error){
                return res.status(500).json({error: "Unexpected error"}) 
            }
           
            let messageObject: Message = response.message
            messageObject['username'] = req.user.username
            messageObject['emojis'] = {}
           
            io.to(channelId.toString()).emit("send-message", messageObject)
            

            return res.status(201).json({status: "success"})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
          }
    }

    static async apiEditMessage(req: IGetUserAuthInfoRequest, res: Response, _next: NextFunction){
        try{

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array() });
            }
            
            if(!req.user) return res.status(403)


            const message: string = req.body.message
            
            const messageId = parseInt(req.params.id)

            if(isNaN(messageId)) return res.status(500).json({error: "Missing message id in param"})

            let canEditMessage = await MessageDao.canUserEditMessage(messageId, req.user.id)

            if(canEditMessage.error){
                return res.status(500).json({error: "Unexpected error"}) 
            }

            if(canEditMessage?.canEdit === false) return res.status(canEditMessage.codeError).json({success: false, 
                error: canEditMessage.explanation })
            
            // deepcode ignore Sqli: <sanatized in middleware>
            let response = await MessageDao.editMessage(messageId, message)

            if(response.error){
                return res.status(500).json({error: "Unexpected error"}) 
            }

            let messageObject: Message = response.message
            
            io.to(messageObject.channel_id.toString()).emit("edit-message", 
                {editedText: messageObject.message_text, editedTime: messageObject.edited_on, messageId: messageObject.id})

            return res.status(201).json({status: "success"})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
        }
    }

    static async apiDeleteMessage(req: IGetUserAuthInfoRequest, res: Response, _next: NextFunction){
        try{
            if(!req.user) return res.status(403)
            
            const messageId = parseInt(req.params.id)
            if(isNaN(messageId)) return res.status(500).json({error: "Missing message id in param"})
            
            let canDeleteMessage = await MessageDao.canUserDeleteMessage(messageId, req.user.id)

            if(canDeleteMessage.error){
                return res.status(500).json({error: "Unexpected error"}) 
            }
            
            if(canDeleteMessage.canDelete === false) return res.status(canDeleteMessage.codeError).json({success: false, 
                error: canDeleteMessage.explanation })

            let response = await MessageDao.deleteMessage(messageId)

            if(response.error){
                return res.status(500).json({error: "Unexpected error"}) 
            }
            
            io.to(response.message.channel_id.toString()).emit("delete-message", 
                messageId)
            return res.status(201).json({status: "success"})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
          }
    }

    static async apiGetMessages(req: IGetUserAuthInfoRequest, res: Response, _next: NextFunction){
        try{
            if(!req.user) return res.status(403)
            
            const channelId = parseInt(req.params.id)
            if(isNaN(channelId)) return res.status(500).json({error: "Missing channel id in param"})

            let messages = await MessageDao.getChannelMessages(channelId)

            if(messages.error){
                return res.status(500).json({error: "Unexpected error"}) 
            }
        
            return res.status(201).json({status: "success", messages: messages.messages})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
          }
    }
    


}