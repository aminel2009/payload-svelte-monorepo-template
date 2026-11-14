import './src/lib/loadEnv'

process.env.PAYLOAD_SECRET ||= 'test-secret'
process.env.DATABASE_URL ||= 'file:./data/test.db'
