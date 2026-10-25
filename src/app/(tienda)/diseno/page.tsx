import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CartItem } from "@/components/ui/cart-item";
import { FilterChip } from "@/components/ui/filter-chip";
import { FreeShippingBar } from "@/components/ui/free-shipping-bar";
import { Icon, ICON_NAMES } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { Notice } from "@/components/ui/notice";
import { OrderSummary } from "@/components/ui/order-summary";
import { Price } from "@/components/ui/price";
import { ProductCard } from "@/components/ui/product-card";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Rating } from "@/components/ui/rating";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { VariantPicker } from "@/components/ui/variant-picker";
import { STORE } from "@/lib/store";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Componentes", robots: { index: false } };

const IMG = "https://placehold.co/1200x1500/ece8df/5c564d?text=";

// Catálogo de componentes del design system para revisarlos en claro y oscuro.
// Solo en desarrollo (npm run dev): en producción responde 404.
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Componentes</h1>

      <Section title="Button">
        <Button>Agregar al carro</Button>
        <Button variant="secondary">Ver carro</Button>
        <Button variant="ghost">Seguir comprando</Button>
        <Button size="sm" variant="secondary">
          Aplicar cupón
        </Button>
        <Button size="lg" iconStart="lock">
          Pagar $43.960
        </Button>
        <Button size="lg" loading>
          Pagando
        </Button>
        <Button iconEnd="chevronRight" href="/">
          Ir a pagar (enlace)
        </Button>
        <Button disabled variant="secondary">
          Sin stock
        </Button>
      </Section>

      <Section title="IconButton">
        <IconButton icon="heart" label="Guardar en favoritos" />
        <IconButton icon="heart" label="Quitar de favoritos" pressed />
        <IconButton icon="search" label="Buscar" variant="ghost" />
        <IconButton icon="close" label="Cerrar" size="sm" />
      </Section>

      <Section title="FilterChip">
        <FilterChip count={12}>Cerámica</FilterChip>
        <FilterChip defaultSelected count={4}>
          Arena
        </FilterChip>
        <FilterChip>Disponible</FilterChip>
      </Section>

      <Section title="Badge">
        <Badge>Agotado</Badge>
        <Badge tone="new">Nuevo</Badge>
        <Badge tone="sale">−30%</Badge>
        <Badge tone="success" icon="check">
          Entregado
        </Badge>
        <Badge tone="warning" icon="alert">
          Pago pendiente
        </Badge>
        <Badge tone="danger" icon="close">
          Anulado
        </Badge>
      </Section>

      <Section title="Price">
        <Price amount={12490} />
        <Price amount={39990} compareAt={52990} />
        <Price amount={27990} compareAt={34990} size="lg" />
        <Price amount={8990} size="sm" unit="c/u" />
      </Section>

      <Section title="Rating">
        <Rating value={4.6} count={128} />
        <Rating value={3.5} count={9} size="lg" />
      </Section>

      <Section title="VariantPicker">
        <VariantPicker
          label="Color"
          type="color"
          defaultValue="arena"
          options={[
            { value: "arena", label: "Arena", color: "#d8c8ad" },
            { value: "pino", label: "Verde pino", color: "#1f5a44" },
            { value: "terracota", label: "Terracota", color: "#b5643c", disabled: true },
          ]}
        />
        <VariantPicker
          label="Tamaño"
          defaultValue="m"
          options={[
            { value: "m", label: "Mediana" },
            { value: "l", label: "Grande" },
            { value: "xl", label: "Extra grande", disabled: true },
          ]}
        />
      </Section>

      <Section title="ProductCard" grid>
        <ProductCard
          title="Taza de gres esmaltado"
          brand="Cerámica del Sur"
          href="/productos/taza-de-gres-esmaltado"
          image={`${IMG}Taza`}
          imageAlt="Taza de gres esmaltado color arena"
          price={12490}
          rating={4.6}
          reviewCount={128}
          badge="Nuevo"
        />
        <ProductCard
          title="Manta de lana tejida"
          brand="Telar Andino"
          href="/productos/manta-de-lana-tejida"
          image={`${IMG}Manta`}
          price={39990}
          compareAt={52990}
          wishlisted
        />
        <ProductCard
          title="Florero de greda"
          brand="Cerámica del Sur"
          href="/productos/florero-de-greda"
          price={19990}
          soldOut
        />
        <ProductCard
          title="Vela de soya en frasco"
          brand="Cera Viva"
          href="/productos/vela-de-soya-en-frasco"
          image={`${IMG}Vela`}
          price={11990}
          adding
        />
      </Section>

      <Section title="QuantityStepper">
        <QuantityStepper defaultValue={1} max={3} />
        <QuantityStepper size="sm" defaultValue={2} />
      </Section>

      <Section title="CartItem" column>
        <CartItem
          title="Taza de gres esmaltado"
          variant="Color: Arena"
          image={`${IMG}Taza`}
          href="/productos/taza-de-gres-esmaltado"
          price={12490}
          quantity={2}
          max={18}
        />
        <CartItem title="Cojín de lino" variant="Color: Oliva" price={16990} compareAt={21990} quantity={1} max={1} />
      </Section>

      <Section title="FreeShippingBar" column>
        <FreeShippingBar subtotal={34980} threshold={STORE.freeShippingThreshold} />
        <FreeShippingBar subtotal={43960} threshold={STORE.freeShippingThreshold} />
      </Section>

      <Section title="OrderSummary">
        <OrderSummary subtotal={34980} itemsCount={2} />
        <OrderSummary subtotal={52970} discount={5000} discountLabel="Cupón DESCUENTO5000" shipping={0} itemsCount={3} loading ctaLabel="Pagando" />
      </Section>

      <Section title="TextField y Select" grid>
        <TextField label="Correo" type="email" autoComplete="email" placeholder="tu@correo.cl" hint="Ahí te enviamos la boleta y el seguimiento." />
        <TextField
          label="RUT"
          inputMode="numeric"
          defaultValue="11.111.111-2"
          error="Revisa el dígito verificador: es el número o la K después del guion."
        />
        <Select
          label="Región"
          placeholder="Elige tu región"
          options={[
            { value: "rm", label: "Metropolitana de Santiago" },
            { value: "v", label: "Valparaíso" },
          ]}
        />
        <Select
          label="Comuna"
          placeholder="Elige tu comuna"
          options={[{ value: "providencia", label: "Providencia" }]}
          error="Elige la comuna para calcular la fecha de entrega."
        />
      </Section>

      <Section title="Notice" column>
        <Notice title="Tu pedido sigue guardado">Puedes reintentar el pago o elegir otro medio.</Notice>
        <Notice tone="success">Agregaste Taza de gres esmaltado al carro</Notice>
        <Notice tone="warning" title="Quedan 2 unidades de este color" />
        <Notice tone="danger" title="Revisa 5 datos para continuar" action={<Button variant="ghost" size="sm">Ver</Button>}>
          Nombre, RUT, Teléfono, Comuna, y Calle y número.
        </Notice>
      </Section>

      <Section title="Icon">
        {ICON_NAMES.map((name) => (
          <span key={name} className={styles.icon}>
            <Icon name={name} size={24} />
            <code>{name}</code>
          </span>
        ))}
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
  grid,
  column,
}: {
  title: string;
  children: ReactNode;
  grid?: boolean;
  column?: boolean;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={grid ? styles.grid : column ? styles.column : styles.row}>{children}</div>
    </section>
  );
}
