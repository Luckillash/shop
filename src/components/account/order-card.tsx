import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCLP } from "@/lib/format/clp";
import { formatLongDate } from "@/lib/format/dates";
import { itemImage, type AccountOrder } from "@/lib/orders/account";
import { orderStatusLine, orderSummaryLine } from "@/lib/orders/customer-view";
import { customerStatusBadge } from "@/lib/orders/order-status";
import styles from "./account.module.css";

const MAX_THUMBS = 3;

// Tarjeta de Mis pedidos. *Ver detalle* se estira sobre toda la tarjeta (en móvil la tarjeta entera
// es el enlace, como en MisPedidosMovil) y en móvil se ve solo su flecha.
export function OrderCard({ order, now }: { order: AccountOrder; now: Date }) {
  const badge = customerStatusBadge(order.status);
  const thumbs = order.items.slice(0, MAX_THUMBS);
  const more = order.items.length - thumbs.length;

  return (
    <li className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.cardTitleRow}>
          <h2 className={styles.cardTitle}>
            Pedido <span className={styles.number}>N.º {order.order_number}</span>
          </h2>
          <Badge tone={badge.tone} icon={badge.icon}>
            {badge.label}
          </Badge>
        </div>
        <span className={styles.muted}>Comprado el {formatLongDate(new Date(order.placed_at))}</span>
      </div>

      <div className={styles.cardBottom}>
        <div className={styles.cardInfo}>
          <div className={styles.thumbs} aria-hidden="true">
            {thumbs.map((item) => {
              const image = itemImage(item);
              return image ? (
                // eslint-disable-next-line @next/next/no-img-element -- placehold.co responde SVG (D-015)
                <img key={item.id} src={image.url} alt="" className={styles.thumb} loading="lazy" />
              ) : (
                <span key={item.id} className={styles.thumb} />
              );
            })}
            {more > 0 && <span className={styles.thumbMore}>+{more}</span>}
          </div>
          <div className={styles.cardText}>
            <strong className={styles.statusLine}>{orderStatusLine(order, now)}</strong>
            <span className={styles.muted}>{orderSummaryLine(order.items, order.shipping_method)}</span>
          </div>
        </div>
        <div className={styles.cardAction}>
          <span className={styles.total}>{formatCLP(Math.round(Number(order.total)))}</span>
          <Button
            href={`/cuenta/pedidos/${order.order_number}`}
            variant="secondary"
            size="sm"
            iconEnd="chevronRight"
            className={styles.detailLink}
          >
            Ver detalle<span className="sr-only"> del pedido N.º {order.order_number}</span>
          </Button>
        </div>
      </div>
    </li>
  );
}
