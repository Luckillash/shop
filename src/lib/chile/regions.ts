// Regiones y comunas de Chile (B31), de norte a sur, con los nombres oficiales de la SUBDERE
// sin el prefijo "Región de". Se guardan tal cual en addresses.region y addresses.city.
// place_order compara la región con "Metropolitana de Santiago" para el costo del despacho.
// Sin despacho (Starken, Chile continental): Isla de Pascua, Juan Fernández y Antártica.

export const METROPOLITAN_REGION = "Metropolitana de Santiago";

/** Comunas a las que no se despacha; no aparecen en la lista */
export const NO_DELIVERY_COMMUNES = ["Isla de Pascua", "Juan Fernández", "Antártica"] as const;

const ALL_REGIONS: { name: string; communes: string[] }[] = [
  { name: "Arica y Parinacota", communes: ["Arica", "Camarones", "General Lagos", "Putre"] },
  {
    name: "Tarapacá",
    communes: ["Alto Hospicio", "Camiña", "Colchane", "Huara", "Iquique", "Pica", "Pozo Almonte"],
  },
  {
    name: "Antofagasta",
    communes: [
      "Antofagasta", "Calama", "María Elena", "Mejillones", "Ollagüe", "San Pedro de Atacama",
      "Sierra Gorda", "Taltal", "Tocopilla",
    ],
  },
  {
    name: "Atacama",
    communes: [
      "Alto del Carmen", "Caldera", "Chañaral", "Copiapó", "Diego de Almagro", "Freirina", "Huasco",
      "Tierra Amarilla", "Vallenar",
    ],
  },
  {
    name: "Coquimbo",
    communes: [
      "Andacollo", "Canela", "Combarbalá", "Coquimbo", "Illapel", "La Higuera", "La Serena",
      "Los Vilos", "Monte Patria", "Ovalle", "Paiguano", "Punitaqui", "Río Hurtado", "Salamanca",
      "Vicuña",
    ],
  },
  {
    name: "Valparaíso",
    communes: [
      "Algarrobo", "Cabildo", "Calera", "Calle Larga", "Cartagena", "Casablanca", "Catemu", "Concón",
      "El Quisco", "El Tabo", "Hijuelas", "Isla de Pascua", "Juan Fernández", "La Cruz", "La Ligua",
      "Limache", "Llaillay", "Los Andes", "Nogales", "Olmué", "Panquehue", "Papudo", "Petorca",
      "Puchuncaví", "Putaendo", "Quillota", "Quilpué", "Quintero", "Rinconada", "San Antonio",
      "San Esteban", "San Felipe", "Santa María", "Santo Domingo", "Valparaíso", "Villa Alemana",
      "Viña del Mar", "Zapallar",
    ],
  },
  {
    name: METROPOLITAN_REGION,
    communes: [
      "Alhué", "Buin", "Calera de Tango", "Cerrillos", "Cerro Navia", "Colina", "Conchalí",
      "Curacaví", "El Bosque", "El Monte", "Estación Central", "Huechuraba", "Independencia",
      "Isla de Maipo", "La Cisterna", "La Florida", "La Granja", "La Pintana", "La Reina", "Lampa",
      "Las Condes", "Lo Barnechea", "Lo Espejo", "Lo Prado", "Macul", "Maipú", "María Pinto",
      "Melipilla", "Ñuñoa", "Padre Hurtado", "Paine", "Pedro Aguirre Cerda", "Peñaflor", "Peñalolén",
      "Pirque", "Providencia", "Pudahuel", "Puente Alto", "Quilicura", "Quinta Normal", "Recoleta",
      "Renca", "San Bernardo", "San Joaquín", "San José de Maipo", "San Miguel", "San Pedro",
      "San Ramón", "Santiago", "Talagante", "Tiltil", "Vitacura",
    ],
  },
  {
    name: "Libertador General Bernardo O'Higgins",
    communes: [
      "Chépica", "Chimbarongo", "Codegua", "Coinco", "Coltauco", "Doñihue", "Graneros", "La Estrella",
      "Las Cabras", "Litueche", "Lolol", "Machalí", "Malloa", "Marchigüe", "Mostazal", "Nancagua",
      "Navidad", "Olivar", "Palmilla", "Paredones", "Peralillo", "Peumo", "Pichidegua", "Pichilemu",
      "Placilla", "Pumanque", "Quinta de Tilcoco", "Rancagua", "Rengo", "Requínoa", "San Fernando",
      "San Vicente", "Santa Cruz",
    ],
  },
  {
    name: "Maule",
    communes: [
      "Cauquenes", "Chanco", "Colbún", "Constitución", "Curepto", "Curicó", "Empedrado", "Hualañé",
      "Licantén", "Linares", "Longaví", "Maule", "Molina", "Parral", "Pelarco", "Pelluhue",
      "Pencahue", "Rauco", "Retiro", "Río Claro", "Romeral", "Sagrada Familia", "San Clemente",
      "San Javier", "San Rafael", "Talca", "Teno", "Vichuquén", "Villa Alegre", "Yerbas Buenas",
    ],
  },
  {
    name: "Ñuble",
    communes: [
      "Bulnes", "Chillán", "Chillán Viejo", "Cobquecura", "Coelemu", "Coihueco", "El Carmen",
      "Ninhue", "Ñiquén", "Pemuco", "Pinto", "Portezuelo", "Quillón", "Quirihue", "Ránquil",
      "San Carlos", "San Fabián", "San Ignacio", "San Nicolás", "Treguaco", "Yungay",
    ],
  },
  {
    name: "Biobío",
    communes: [
      "Alto Biobío", "Antuco", "Arauco", "Cabrero", "Cañete", "Chiguayante", "Concepción",
      "Contulmo", "Coronel", "Curanilahue", "Florida", "Hualpén", "Hualqui", "Laja", "Lebu",
      "Los Álamos", "Los Ángeles", "Lota", "Mulchén", "Nacimiento", "Negrete", "Penco", "Quilaco",
      "Quilleco", "San Pedro de la Paz", "San Rosendo", "Santa Bárbara", "Santa Juana", "Talcahuano",
      "Tirúa", "Tomé", "Tucapel", "Yumbel",
    ],
  },
  {
    name: "La Araucanía",
    communes: [
      "Angol", "Carahue", "Cholchol", "Collipulli", "Cunco", "Curacautín", "Curarrehue", "Ercilla",
      "Freire", "Galvarino", "Gorbea", "Lautaro", "Loncoche", "Lonquimay", "Los Sauces", "Lumaco",
      "Melipeuco", "Nueva Imperial", "Padre Las Casas", "Perquenco", "Pitrufquén", "Pucón", "Purén",
      "Renaico", "Saavedra", "Temuco", "Teodoro Schmidt", "Toltén", "Traiguén", "Victoria",
      "Vilcún", "Villarrica",
    ],
  },
  {
    name: "Los Ríos",
    communes: [
      "Corral", "Futrono", "La Unión", "Lago Ranco", "Lanco", "Los Lagos", "Máfil", "Mariquina",
      "Paillaco", "Panguipulli", "Río Bueno", "Valdivia",
    ],
  },
  {
    name: "Los Lagos",
    communes: [
      "Ancud", "Calbuco", "Castro", "Chaitén", "Chonchi", "Cochamó", "Curaco de Vélez", "Dalcahue",
      "Fresia", "Frutillar", "Futaleufú", "Hualaihué", "Llanquihue", "Los Muermos", "Maullín",
      "Osorno", "Palena", "Puerto Montt", "Puerto Octay", "Puerto Varas", "Puqueldón", "Purranque",
      "Puyehue", "Queilén", "Quellón", "Quemchi", "Quinchao", "Río Negro", "San Juan de la Costa",
      "San Pablo",
    ],
  },
  {
    name: "Aysén del General Carlos Ibáñez del Campo",
    communes: [
      "Aysén", "Chile Chico", "Cisnes", "Cochrane", "Coyhaique", "Guaitecas", "Lago Verde",
      "O'Higgins", "Río Ibáñez", "Tortel",
    ],
  },
  {
    name: "Magallanes y de la Antártica Chilena",
    communes: [
      "Antártica", "Cabo de Hornos", "Laguna Blanca", "Natales", "Porvenir", "Primavera",
      "Punta Arenas", "Río Verde", "San Gregorio", "Timaukel", "Torres del Paine",
    ],
  },
];

/** Total de comunas del país, incluidas las que no tienen despacho (para los tests) */
export const COMMUNE_COUNT = ALL_REGIONS.reduce((total, r) => total + r.communes.length, 0);

const noDelivery = new Set<string>(NO_DELIVERY_COMMUNES);

/** Regiones con las comunas a las que se despacha, ordenadas alfabéticamente (es-CL) */
export const REGIONS: { name: string; communes: string[] }[] = ALL_REGIONS.map((r) => ({
  name: r.name,
  communes: r.communes.filter((c) => !noDelivery.has(c)).sort((a, b) => a.localeCompare(b, "es")),
}));

const byName = new Map(REGIONS.map((r) => [r.name, r]));

export function isRegion(name: string): boolean {
  return byName.has(name);
}

/** true si la comuna pertenece a la región y tiene despacho */
export function isCommuneOf(region: string, commune: string): boolean {
  return byName.get(region)?.communes.includes(commune) ?? false;
}

export function communesOf(region: string): string[] {
  return byName.get(region)?.communes ?? [];
}
