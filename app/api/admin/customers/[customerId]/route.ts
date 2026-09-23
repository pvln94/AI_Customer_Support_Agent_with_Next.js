// app/api/admin/customers/[customerId]/route.ts
import { connectDB } from "@/lib/mongodb";
import { CustomerModel } from "@/models/Customer";

export const dynamic = "force-dynamic";

// Next.js 16: route params is a Promise.
export async function GET(_req: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  try {
    await connectDB();
    const customer = await CustomerModel.findOne({ customerId }).lean();
    if (!customer)
      return Response.json({ error: { code: "NOT_FOUND", message: "Customer not found." } }, { status: 404 });
    return Response.json({ customer });
  } catch {
    return Response.json({ error: { code: "DB_ERROR", message: "Lookup failed." } }, { status: 503 });
  }
}
