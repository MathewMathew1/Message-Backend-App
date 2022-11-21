import fs from "fs"

const text: string = fs.readFileSync("./common-passwords.new.txt", "utf8")
const commonPasswords = text.split("\n")

export {commonPasswords}