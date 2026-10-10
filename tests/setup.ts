process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://basmart:basmart@localhost:5432/basmart_test?schema=public";
process.env.SESSION_SECRET = "test-secret";
process.env.PAYMENT_PROVIDER = "mock";
