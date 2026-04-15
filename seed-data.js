
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.upsert({
        where: { email: 'mock@example.com' },
        update: {},
        create: {
            id: 'mock-id',
            email: 'mock@example.com',
            name: 'Usuario Demo',
            image: 'https://ui-avatars.com/api/?name=Usuario+Demo',
        },
    });

    const userId = user.id;

    // Clear existing if needed
    await prisma.transaction.deleteMany({ where: { userId } });

    const transactions = [
        { description: 'Sueldo Enero', amount: 1500000, type: 'INCOME', currency: 'ARS', incomeType: 'BLANCO', date: new Date('2026-01-01') },
        { description: 'Inversión USD', amount: 200, type: 'INCOME', currency: 'USD', incomeType: 'NEGRO', date: new Date('2026-01-05') },
        { description: 'Videojuego Steam', amount: 50, type: 'EXPENSE', currency: 'USD', frequency: 'VARIABLE', date: new Date('2026-01-02') },
        { description: 'Alquiler', amount: 400000, type: 'EXPENSE', currency: 'ARS', frequency: 'FIXED', date: new Date('2026-01-01') },
        { description: 'Supermercado', amount: 120000, type: 'EXPENSE', currency: 'ARS', frequency: 'VARIABLE', date: new Date('2026-01-03') },
        { description: 'Sueldo Diciembre', amount: 1400000, type: 'INCOME', currency: 'ARS', incomeType: 'BLANCO', date: new Date('2025-12-01') },
        { description: 'Aguinaldo', amount: 700000, type: 'INCOME', currency: 'ARS', incomeType: 'BLANCO', date: new Date('2025-12-15') },
        { description: 'Regalos Navidad', amount: 200000, type: 'EXPENSE', currency: 'ARS', frequency: 'VARIABLE', date: new Date('2025-12-20') },
        { description: 'Sueldo Noviembre', amount: 1300000, type: 'INCOME', currency: 'ARS', incomeType: 'BLANCO', date: new Date('2025-11-01') },
        { description: 'Gastos Varios', amount: 500000, type: 'EXPENSE', currency: 'ARS', frequency: 'VARIABLE', date: new Date('2025-11-15') },
    ];

    for (const t of transactions) {
        await prisma.transaction.create({
            data: {
                ...t,
                userId
            }
        });
    }

    console.log('User and dummy data seeded successfuly:', userId);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
