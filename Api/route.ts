import express from "express"
import authRequired from "../middleware/authRequired"
import userInChannel from "../middleware/userInChannel"
import AuthenticationCtrl from "./Authentication"
import MessageCtrl from "./Message"
import InviteCtrl from "./Invite"
import ChannelCtrl from "./Channel"
import EmojiReactionCtrl from "./EmojiReaction"
import { check } from 'express-validator'
import FriendCtrl from "./Friend"
import FriendInviteCtrl from "./FriendInvite"

const router = express.Router()

const userSanitize = [
  check('username').isString().isLength({ min: 3 }).trim().escape(),
  check('password').isString().isLength({ min: 8 }).trim().escape(),
]

const passwordSanitize = [
  check('oldPassword').isString().isLength({ min: 8 }).trim().escape(),
  check('newPassword').isString().isLength({ min: 8 }).trim().escape(),
]

const messageSanitize = [
  check('message').isString().isLength({ min: 1 }).trim().escape()
]

const channelNameSanitize = [
  check('channelName').isString().isLength({ min: 3 }).trim().escape()
]

const changePrivilegesSanitize = [
  check('userId').isNumeric(),
  check('canInvite').isBoolean().trim().escape()
]

const inviteSanitize = [
  check('userId').isNumeric()
]


///AUTH
router.route("/sign-up").post(userSanitize, AuthenticationCtrl.apiSignUp)
router.route("/login").post(userSanitize, AuthenticationCtrl.apiLoginIn)
router.route("/user/password").patch(authRequired, passwordSanitize, AuthenticationCtrl.changePassword)
// MESSAGES
router.route("/message/channel/id/:id").post(authRequired, userInChannel, messageSanitize,  MessageCtrl.apiSendMessage)
.get(authRequired, userInChannel, MessageCtrl.apiGetMessages)
router.route("/message/id/:id").delete(authRequired, MessageCtrl.apiDeleteMessage)
.patch(authRequired, messageSanitize, MessageCtrl.apiEditMessage)
// INVITES
router.route("/invite/channel/id/:id").post(authRequired, inviteSanitize, InviteCtrl.apiSendInvite)
router.route("/invite/id/:id").patch(authRequired, InviteCtrl.apiAcceptInvite).delete(authRequired, InviteCtrl.apiDeleteInvite)
router.route("/invite/mark-as-seen/id/:id").patch(authRequired, InviteCtrl.apiMarkInviteAsSeen)
//CHANNEL
router.route("/channel/create").post(authRequired, channelNameSanitize, ChannelCtrl.apiCreateChannel)
router.route("/channel/delete/id/:id").delete(authRequired, ChannelCtrl.apiDeleteChannel)
router.route("/channel/leave/id/:id").delete(authRequired, userInChannel, ChannelCtrl.apiLeaveChannel)
router.route("/channel/removeUser/id/:id").delete(authRequired, ChannelCtrl.apiRemoveUser)
router.route("/channel/allowance/id/:id").patch(authRequired, changePrivilegesSanitize, ChannelCtrl.apiChangeUserAllowance)
router.route("/channel/id/:id").get(authRequired, userInChannel, ChannelCtrl.apiGetChannelData)
router.route("/channel/mark-last-message/:id").patch(authRequired, userInChannel, ChannelCtrl.apiMarkLastSeenMessage)
//USERINFO
router.route("/user/invites").get(authRequired, InviteCtrl.apiGetUserInvites)
router.route("/user/invites-sent").get(authRequired, InviteCtrl.apiGetInvitesSentByUser)
router.route("/user/channels").get(authRequired, ChannelCtrl.apiGetUserChannels)
router.route("/user/info").get(authRequired, AuthenticationCtrl.apiUserData)
router.route("/user/friends").get(authRequired, FriendCtrl.apiGetUserFriendships)
router.route("/user/friend-invites").get(authRequired, FriendInviteCtrl.apiGetUserInvites)
router.route("/user/friend-invites-sent").get(authRequired, FriendInviteCtrl.apiGetInvitesSentByUser)
//EMOJI
router.route("/emoji/message/id/:id").post(authRequired, EmojiReactionCtrl.apiAddEmojiReactionToMessage)
router.route("/emoji/message/id/:id").delete(authRequired, EmojiReactionCtrl.apiRemoveEmoji)
//FRIENDINVITES
router.route("/friend-invite").post(authRequired, inviteSanitize, FriendInviteCtrl.apiSendInvite)
router.route("/friend-invite/id/:id").patch(authRequired, FriendInviteCtrl.apiAcceptInvite).delete(authRequired, FriendInviteCtrl.apiDeleteInvite)
router.route("/friend-invite/mark-as-seen/id/:id").patch(authRequired, FriendInviteCtrl.apiMarkInviteAsSeen)
//FRIEND
router.route("/user/friends/friendId/:friendId").delete(authRequired, FriendCtrl.apiRemoveUserFriendships)

export default router