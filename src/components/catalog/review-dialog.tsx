"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { GuestAccountForm } from "@/components/auth/guest-account-form";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { Notice } from "@/components/ui/notice";
import { TextArea } from "@/components/ui/text-area";
import { TextField } from "@/components/ui/text-field";
import { getReviewEligibility, publishReview } from "@/lib/reviews/actions";
import {
  BODY_MAX,
  NAME_MAX,
  purchaseLine,
  ratingWords,
  REVIEW_MESSAGES,
  reviewLoginHref,
  signatureHint,
  TITLE_MAX,
  validateReview,
  type ReviewEligibility,
  type ReviewField,
  type ReviewState,
} from "@/lib/reviews/review";
import { mayHaveSession } from "@/lib/wishlist/state";
import styles from "./review.module.css";

// Template EscribirResena (7.6, D-031): <dialog> modal (el navegador atrapa el foco y Esc lo
// cierra; al cerrar, el foco vuelve a *Escribir una opinión*). La Ficha es estática: quién puede
// opinar se pregunta al abrirlo, nunca en el render (trampa 62). Sin sesión, lleva a Ingresar.

type Props = {
  productId: string;
  /** /productos/<slug>: Ingresar vuelve aquí, a las opiniones */
  productPath: string;
  productName: string;
  image: string | null;
  /** Nombre del atributo de las variantes ("Color"), para *Color: Pino* */
  variantLabel: string | null;
};

export function WriteReview({ productId, productPath, productName, image, variantLabel }: Props) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  // Cada apertura empieza de cero (el formulario se vuelve a montar)
  const [opening, setOpening] = useState(0);
  const titleId = `escribir-opinion-${productId}`;

  async function load() {
    setEligibility(null);
    let result: ReviewEligibility;
    try {
      result = await getReviewEligibility(productId);
    } catch {
      result = { status: "error" };
    }
    if (result.status === "signin") {
      dialog.current?.close();
      router.push(reviewLoginHref(productPath));
      return;
    }
    setEligibility(result);
  }

  function open(event: { currentTarget: HTMLElement }) {
    if (!mayHaveSession(document.cookie)) {
      router.push(reviewLoginHref(productPath));
      return;
    }
    returnFocus.current = event.currentTarget;
    setOpening((n) => n + 1);
    dialog.current?.showModal();
    void load();
  }

  const close = () => dialog.current?.close();

  return (
    <>
      <Button variant="secondary" onClick={open}>
        Escribir una opinión
      </Button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClose={() => returnFocus.current?.focus()}
        onKeyDown={trapTab}
      >
        <div className={styles.body}>
          <div className={styles.head}>
            <h2 id={titleId} className={styles.title}>
              {eligibility?.status === "eligible" && eligibility.review ? "Edita tu opinión" : "Escribe tu opinión"}
            </h2>
            <IconButton icon="close" label="Cerrar" variant="ghost" onClick={close} />
          </div>
          <Content
            key={opening}
            eligibility={eligibility}
            productId={productId}
            productPath={productPath}
            productName={productName}
            image={image}
            variantLabel={variantLabel}
            onClose={close}
            onRetry={() => void load()}
          />
        </div>
      </dialog>
    </>
  );
}

type ContentProps = Props & {
  eligibility: ReviewEligibility | null;
  onClose: () => void;
  onRetry: () => void;
};

function Content({ eligibility, onClose, onRetry, ...product }: ContentProps) {
  if (!eligibility) {
    return (
      <p className={styles.muted} role="status">
        Revisando tu compra
      </p>
    );
  }

  switch (eligibility.status) {
    case "signin":
      return null;
    case "error":
      return (
        <Notice tone="danger" action={<Button variant="ghost" size="sm" onClick={onRetry}>Volver a intentarlo</Button>}>
          {REVIEW_MESSAGES.load}
        </Notice>
      );
    case "guest":
      return (
        <div className={styles.stack}>
          <Notice title="Para opinar, crea tu cuenta">
            Las opiniones se publican con tu nombre. Al crear tu cuenta conservas tus pedidos; cuando recibas el
            producto, vuelve a esta ficha para opinar.
          </Notice>
          {eligibility.account ? (
            <GuestAccountForm
              {...eligibility.account}
              title="Crea tu cuenta"
              lead={`Solo falta una contraseña. El pedido N.º ${eligibility.account.orderNumber} queda en tu cuenta.`}
            />
          ) : (
            <div className={styles.actions}>
              <Button variant="secondary" onClick={onClose}>
                Volver al producto
              </Button>
              <Button href={reviewLoginHref(product.productPath)}>
                Ingresar o crear cuenta
              </Button>
            </div>
          )}
        </div>
      );
    case "not_delivered":
      return (
        <div className={styles.stack}>
          <Notice title={REVIEW_MESSAGES.notEligible}>
            Las opiniones son de quienes ya compraron y recibieron el producto. Si tu pedido va en camino, vuelve
            cuando llegue.
          </Notice>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={onClose}>
              Volver al producto
            </Button>
          </div>
        </div>
      );
    case "eligible":
      return <ReviewForm eligibility={eligibility} onClose={onClose} {...product} />;
  }
}

const IDLE: ReviewState = { status: "idle" };
const FIELDS: ReviewField[] = ["firstName", "rating", "title", "body"];

type FormProps = Props & {
  eligibility: Extract<ReviewEligibility, { status: "eligible" }>;
  onClose: () => void;
};

function ReviewForm({ eligibility, productId, productName, image, variantLabel, onClose }: FormProps) {
  const editing = eligibility.review !== null;
  const needsName = eligibility.name === null;
  const [rating, setRating] = useState<number | null>(eligibility.review?.rating ?? null);
  const [title, setTitle] = useState(eligibility.review?.title ?? "");
  const [body, setBody] = useState(eligibility.review?.body ?? "");
  const [firstName, setFirstName] = useState("");
  const [errors, setErrors] = useState<Partial<Record<ReviewField, string>>>({});
  const focusField = useRef<ReviewField | null>(null);
  const [state, action, pending] = useActionState(async (prev: ReviewState, formData: FormData) => {
    const next = await publishReview(prev, formData);
    if (next.status === "error") {
      setErrors(next.errors);
      focusField.current = FIELDS.find((field) => next.errors[field]) ?? null;
    }
    return next;
  }, IDLE);

  // El primer campo con error recibe el foco cuando el fieldset deja de estar deshabilitado (trampa 88)
  useEffect(() => {
    if (pending || !focusField.current) return;
    focusReviewField(focusField.current);
    focusField.current = null;
  }, [pending]);

  function clearError(field: ReviewField) {
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const check = validateReview({ rating, title, body, firstName }, needsName);
    if (!check.ok) {
      setErrors(check.errors);
      const first = FIELDS.find((field) => check.errors[field]);
      if (first) focusReviewField(first);
      return;
    }
    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("rating", String(rating));
    formData.set("title", title);
    formData.set("body", body);
    if (needsName) formData.set("firstName", firstName);
    startTransition(() => action(formData));
  }

  if (state.status === "saved") {
    return (
      <div className={styles.stack}>
        <Notice tone="success" title={state.mode === "created" ? "Gracias, publicamos tu opinión" : "Guardamos los cambios de tu opinión"}>
          {state.mode === "created"
            ? `Ya aparece en la ficha de ${productName}. Puedes editarla cuando quieras desde ahí.`
            : `Ya aparece así en la ficha de ${productName}.`}
        </Notice>
        <div>
          <Button variant="secondary" onClick={onClose} autoFocus>
            Volver al producto
          </Button>
        </div>
      </div>
    );
  }

  const shownName = needsName ? firstName.trim().split(/\s+/)[0] || null : eligibility.name;

  return (
    <>
      <div className={styles.product}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className={styles.thumb} />
        ) : (
          <span className={styles.thumb} aria-hidden="true" />
        )}
        <span className={styles.productText}>
          <span className={styles.productName}>{productName}</span>
          {eligibility.purchase && (
            <span className={styles.muted}>
              {purchaseLine(variantLabel, eligibility.purchase.variantName, eligibility.purchase.placedAt)}
            </span>
          )}
        </span>
      </div>

      <form className={styles.form} onSubmit={submit} noValidate aria-busy={pending || undefined}>
        {state.status === "error" && state.message && <Notice tone="danger">{state.message}</Notice>}
        <fieldset className={styles.fieldset} disabled={pending}>
          {needsName && (
            <TextField
              id="review-firstName"
              label="Tu nombre"
              hint="Lo guardamos en tus datos personales para firmar tu opinión."
              autoComplete="given-name"
              maxLength={NAME_MAX}
              value={firstName}
              error={errors.firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                clearError("firstName");
              }}
            />
          )}
          <Stars
            value={rating}
            error={errors.rating}
            onChange={(n) => {
              setRating(n);
              clearError("rating");
            }}
          />
          <TextField
            id="review-title"
            label="Título (opcional)"
            placeholder="Por ejemplo: Linda y resistente"
            maxLength={TITLE_MAX}
            autoComplete="off"
            value={title}
            error={errors.title}
            onChange={(e) => {
              setTitle(e.target.value);
              clearError("title");
            }}
          />
          <TextArea
            id="review-body"
            label="Tu opinión"
            placeholder="Cuéntale a otros cómo te ha resultado: calidad, tamaño, color."
            maxLength={BODY_MAX}
            value={body}
            error={errors.body}
            hint={signatureHint(shownName, eligibility.commune)}
            onChange={(e) => {
              setBody(e.target.value);
              clearError("body");
            }}
          />
        </fieldset>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={pending}>
            {pending ? "Publicando" : editing ? "Guardar cambios" : "Publicar opinión"}
          </Button>
        </div>
      </form>
    </>
  );
}

const FOCUSABLE = "button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * Tab no sale del modal: del último control vuelve al primero (y Shift+Tab al revés). El <dialog>
 * modal ya deja inerte la página, pero sin esto el foco pasa a la barra del navegador.
 */
function trapTab(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  // El primero es *Cerrar* y el último, el botón principal: las estrellas nunca quedan en los bordes
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = items[0];
  const last = items.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/** Enfoca un campo del modal; en las estrellas, la elegida (o la primera) */
function focusReviewField(field: ReviewField) {
  const target =
    field === "rating"
      ? (document.querySelector<HTMLInputElement>("input[name=rating]:checked") ?? document.getElementById("review-rating-1"))
      : document.getElementById(`review-${field}`);
  target?.focus();
}

/** Cinco estrellas de 44 px como grupo de radios: Tab entra al grupo y las flechas cambian la nota */
function Stars({ value, error, onChange }: { value: number | null; error?: string; onChange: (n: number) => void }) {
  return (
    <fieldset className={styles.stars} aria-describedby={error ? "review-rating-error" : undefined}>
      <legend className={styles.legend}>Tu calificación</legend>
      <div className={styles.starRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={styles.starOption}>
            <input
              id={`review-rating-${n}`}
              type="radio"
              name="rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className={styles.starInput}
            />
            <span className={styles.star} data-on={value != null && n <= value ? "" : undefined}>
              <Icon name="star" size={28} filled={value != null && n <= value} />
            </span>
            <span className="sr-only">{ratingWords(n)}</span>
          </label>
        ))}
        {value != null && (
          <span className={styles.ratingWords} aria-hidden="true">
            {ratingWords(value)}
          </span>
        )}
      </div>
      {error && (
        <span className={styles.error} id="review-rating-error">
          <Icon name="alert" size={16} />
          {error}
        </span>
      )}
    </fieldset>
  );
}
