
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.upsert({
        where: { email: 'mock@example.com' },
        update: {},
        create: {
            email: 'mock@example.com',
            name: 'Usuario Mock',
            image: 'https://ui-avatars.com/api/?name=Usuario+Mock',
        },
    });
    console.log('Mock user created:', user);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
