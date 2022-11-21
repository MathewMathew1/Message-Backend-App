import AuthenticationDAO from "../Dao/AuthenticationDao"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { Request, Response, NextFunction } from 'express';
import { IGetUserAuthInfoRequest } from '../types/types';
import { validationResult } from 'express-validator'

export default class AuthenticationCtrl {
    static async apiSignUp(req: Request, res: Response, next: NextFunction){
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array() });
            }
            const username: string = req.body.username
            const password: string = req.body.password
                
            const commonPasswords = await import("../common-passwords-list")

            for (let i=0; i < commonPasswords["commonPasswords"].length; i++) {
                if (commonPasswords["commonPasswords"][i] === password) {
                    res.status(403).json({error: "Password too common"})
                    return
                }    
            };
            
            let salt: number = process.env.BCRYPT_SALT!==undefined? parseInt(process.env.BCRYPT_SALT): 8
            const hashedPassword = await bcrypt.hash(req.body.password, salt)
            
            let response = await AuthenticationDAO.createUser(hashedPassword, username)

            var { error } = response

            if (error) {
                res.status(400).json({error: "Username already exist" })
                return
            }
            res.status(201).json({status: "success"})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
          }
    }

    static async apiLoginIn(req: Request, res: Response, next: NextFunction){
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array() });
            }

            const username = req.body.username
            const password = req.body.password
            
            let response = await AuthenticationDAO.validateUser(password, username)
            
            var { error } = response
            
            if (error || !response.id) {
                res.status(400).json({error: "Incorrect password or username" })
                return
            }

            if(process.env.ACCESS_TOKEN_SECRET){
                const accessToken = jwt.sign(response.id, process.env.ACCESS_TOKEN_SECRET)
                return res.json({accessToken: accessToken})
            }
            
            res.status(201).json({status: "success", error: "Unexpected error try again"})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
          }
    }

    static async apiUserData(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            if(!req.user) return res.status(403)    

            let response = await AuthenticationDAO.userData(req.user.id)
            
            var { error } = response
            
            if (error) return res.status(400).json({error: "Something went wrong try again" })
            
            res.status(201).json({status: "success", userData:  response.user})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
          }
    }

    static async changePassword(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array() });
            }

            if(!req.user) return res.status(403)    

            const oldPassword = req.body.oldPassword
            const newPassword = req.body.newPassword
            
            const response = await AuthenticationDAO.validatePassword(oldPassword, req.user.id.toString())  
            
            if (response.error || !response.correctPassword) return res.status(400).json({error: "Incorrect Password" })

            const commonPasswords = await import("../common-passwords-list")

            for (let i=0; i < commonPasswords["commonPasswords"].length; i++) {
                if (commonPasswords["commonPasswords"][i] === newPassword) {
                    res.status(403).json({error: "Password too common"})
                    return
                }    
            };
            if(oldPassword===newPassword) return res.status(500).json({ error: "New password cannot be same as old one" })
            
            let salt: number = process.env.BCRYPT_SALT!==undefined? parseInt(process.env.BCRYPT_SALT): 8    
            
            const hashedPassword = await bcrypt.hash(newPassword, salt)
            const changePassword = await AuthenticationDAO.changePassword(hashedPassword, req.user.id.toString())

            if(changePassword?.error) return res.status(500).json({ error: "Something went wrong try again" })

            return res.status(201).json({})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
        }
    }


   
}