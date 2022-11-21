
import { Response, NextFunction } from 'express';
import AuthenticationDAO from '../Dao/AuthenticationDao';
import { IGetUserAuthInfoRequest} from '../types/types';

const authRequired = async (req: IGetUserAuthInfoRequest, res: Response, next: NextFunction) => {
    const authHeader: string | undefined = req.headers["authorization"]
    if(!authHeader) return res.status(401).json({ error: "Authorization header required" })
    
    const token: string = authHeader.split(' ')[1]
    if(token === null || typeof token !== "string") res.status(401).json({ error: "Invalid token" })
    
    let user = await AuthenticationDAO.setUser(token)
    if(!user || user.error){
        return res.status(401).json({ error: "You must be logged in" })
    }
    user.id = parseInt(user.id)
    req.user=user
    next()
}

export default authRequired