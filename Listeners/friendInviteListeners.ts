
let connection: any

export default class friendInviteListener {  
    static async injectDB(conn: any) {
        if(connection) {
            return
        }
        try{
            connection = conn
            
            connection.query("LISTEN new_friend_invite_deleted");
            connection.on('notification', function(data: any) {
                console.log("data")
                friendInviteListener.inviteDeletedListener(data)
            });
            
        } catch (e) {
            console.error(
                `Unable to establish a collection handle in friendInviteListener`
            )
        } 
    }

    static async inviteDeletedListener(data: any) {
        try{
            console.log({data})
        } catch (e) {
            console.log(e)
            return({error: e})
        } 
    }


}