import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const memberships = await p.tenantMembership.findMany({
    where: {
      tenantId: {
        in: [
          '6e6c16d1-9b54-460a-b4a6-720f4808cc60',
          'a033a864-a87d-49f0-9c3e-88d064b9ac38',
          'fc58e18c-311b-4d16-a695-c48dab32e3b1',
        ],
      },
    },
    select: { userId: true, tenantId: true, user: { select: { email: true } } },
  })
  console.log(JSON.stringify(memberships, null, 2))
  await p.$disconnect()
}
main()
