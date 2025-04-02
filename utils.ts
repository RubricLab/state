import crypto from 'node:crypto'

export const generateId = () => crypto.randomBytes(8).toString('hex')
