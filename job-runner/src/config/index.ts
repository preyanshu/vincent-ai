export const config = {
  mongoUri: process.env.MONGO_URI || "mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority",
  redisUrl: process.env.REDIS_URL || "redis://username:password@redis-host:port"
};
