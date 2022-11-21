import { Response, NextFunction } from 'express';
import AuthenticationDAO from '../Dao/AuthenticationDao';
import { IGetUserAuthInfoRequest } from '../types/types';

const setUserMiddleware = async (req: IGetUserAuthInfoRequest, res: Response, next: NextFunction) => {
    const authHeader: string | undefined = req.headers["authorization"]
    if(!authHeader) return
    
    const token: string = authHeader.split(' ')[1]
    if(typeof token !== "string") return
    if(token === null || typeof token !== "string") return
    
    let user = await AuthenticationDAO.setUser(token)
    if(!user.error){
        req.user=user
    }
    
    next()
}

export default setUserMiddleware