// Script para crear el usuario administrador principal
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdmin() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || 'Admin';

    if (!email || !password) {
        console.error('❌ Debes definir ADMIN_EMAIL y ADMIN_PASSWORD como variables de entorno.');
        console.error('   Ejemplo: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=miClave123 node create-admin.js');
        process.exit(1);
    }

    try {
        // Verificar si el usuario ya existe
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            console.log('El usuario ya existe. Actualizando...');
            const passwordHash = await bcrypt.hash(password, 10);
            await prisma.user.update({
                where: { email },
                data: {
                    name,
                    passwordHash,
                    isActive: true,
                    isAdmin: true
                }
            });
            console.log('✅ Usuario actualizado correctamente');
        } else {
            console.log('Creando nuevo usuario administrador...');
            const passwordHash = await bcrypt.hash(password, 10);
            await prisma.user.create({
                data: {
                    email,
                    name,
                    passwordHash,
                    isActive: true,
                    isAdmin: true
                }
            });
            console.log('✅ Usuario administrador creado correctamente');
        }

        console.log('\nCredenciales:');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('Nombre:', name);
        console.log('Admin:', true);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
