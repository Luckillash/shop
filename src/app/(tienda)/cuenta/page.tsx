import { redirect } from "next/navigation";

// /cuenta lleva a Mis pedidos (fase 7.1). La sesión la verifica /cuenta/pedidos.
export default function AccountPage() {
  redirect("/cuenta/pedidos");
}
