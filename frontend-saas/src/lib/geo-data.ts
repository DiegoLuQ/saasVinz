// South American geographic data — static, no external API needed.
// Chile: all 346 comunas grouped by region.
// Other countries: main cities.

export const CHILE_REGIONS_COMUNAS: Record<string, string[]> = {
    "Arica y Parinacota": ["Arica", "Camarones", "General Lagos", "Putre"],
    "Tarapacá": ["Alto Hospicio", "Camiña", "Colchane", "Huara", "Iquique", "Pica", "Pozo Almonte"],
    "Antofagasta": ["Antofagasta", "Calama", "María Elena", "Mejillones", "Ollagüe", "San Pedro de Atacama", "Sierra Gorda", "Taltal", "Tocopilla"],
    "Atacama": ["Alto del Carmen", "Caldera", "Chañaral", "Copiapó", "Diego de Almagro", "Freirina", "Huasco", "Tierra Amarilla", "Vallenar"],
    "Coquimbo": ["Andacollo", "Canela", "Combarbalá", "Coquimbo", "Illapel", "La Higuera", "La Serena", "Los Vilos", "Monte Patria", "Ovalle", "Paiguano", "Punitaqui", "Río Hurtado", "Salamanca", "Vicuña"],
    "Valparaíso": ["Algarrobo", "Cabildo", "Calera", "Calle Larga", "Cartagena", "Casablanca", "Catemu", "Concón", "El Quisco", "El Tabo", "Hijuelas", "Isla de Pascua", "Juan Fernández", "La Cruz", "La Ligua", "Limache", "Llaillay", "Los Andes", "Nogales", "Olmué", "Panquehue", "Papudo", "Petorca", "Puchuncaví", "Putaendo", "Quillota", "Quilpué", "Quintero", "Rinconada", "San Antonio", "San Esteban", "San Felipe", "Santa María", "Santo Domingo", "Valparaíso", "Villa Alemana", "Viña del Mar", "Zapallar"],
    "Metropolitana de Santiago": ["Alhué", "Buin", "Calera de Tango", "Cerrillos", "Cerro Navia", "Colina", "Conchalí", "Curacaví", "El Bosque", "El Monte", "Estación Central", "Huechuraba", "Independencia", "Isla de Maipo", "La Cisterna", "La Florida", "La Granja", "La Pintana", "La Reina", "Lampa", "Las Condes", "Lo Barnechea", "Lo Espejo", "Lo Prado", "Macul", "Maipú", "María Pinto", "Melipilla", "Ñuñoa", "Padre Hurtado", "Paine", "Pedro Aguirre Cerda", "Peñaflor", "Peñalolén", "Pirque", "Providencia", "Pudahuel", "Puente Alto", "Quilicura", "Quinta Normal", "Recoleta", "Renca", "San Bernardo", "San Joaquín", "San José de Maipo", "San Miguel", "San Pedro", "San Ramón", "Santiago", "Talagante", "Tiltil", "Vitacura"],
    "O'Higgins": ["Chimbarongo", "Chépica", "Codegua", "Coinco", "Coltauco", "Doñihue", "La Estrella", "Las Cabras", "Litueche", "Lolol", "Machalí", "Malloa", "Marchihue", "Mostazal", "Nancagua", "Navidad", "Olivar", "Palmilla", "Paredones", "Peralillo", "Peumo", "Pichidegua", "Pichilemu", "Placilla", "Pumanque", "Quinta de Tilcoco", "Rancagua", "Rengo", "Requínoa", "San Fernando", "San Vicente", "Santa Cruz"],
    "Maule": ["Cauquenes", "Chanco", "Colbún", "Constitución", "Curepto", "Curicó", "Empedrado", "Hualañé", "Licantén", "Linares", "Longaví", "Maule", "Molina", "Parral", "Pelarco", "Pelluhue", "Pencahue", "Rauco", "Retiro", "Río Claro", "Romeral", "Sagrada Familia", "San Clemente", "San Javier", "San Rafael", "Talca", "Teno", "Vichuquén", "Villa Alegre", "Yerbas Buenas"],
    "Ñuble": ["Bulnes", "Chillán", "Chillán Viejo", "Cobquecura", "Coelemu", "Coihueco", "El Carmen", "Ninhue", "Ñiquén", "Pemuco", "Pinto", "Portezuelo", "Quillón", "Quirihue", "Ranquil", "San Carlos", "San Fabián", "San Ignacio", "San Nicolás", "Treguaco", "Yungay"],
    "Biobío": ["Alto Biobío", "Antuco", "Arauco", "Cabrero", "Cañete", "Chiguayante", "Concepción", "Contulmo", "Coronel", "Curanilahue", "Florida", "Hualpén", "Hualqui", "Laja", "Lebu", "Los Álamos", "Los Ángeles", "Lota", "Mulchén", "Nacimiento", "Negrete", "Penco", "Quilaco", "Quilleco", "San Pedro de la Paz", "Santa Bárbara", "Santa Juana", "Talcahuano", "Tirúa", "Tomé", "Tucapel", "Yumbel"],
    "La Araucanía": ["Angol", "Carahue", "Cholchol", "Collipulli", "Cunco", "Curacautín", "Curarrehue", "Ercilla", "Freire", "Galvarino", "Gorbea", "Lautaro", "Loncoche", "Lonquimay", "Los Sauces", "Lumaco", "Melipeuco", "Nueva Imperial", "Padre las Casas", "Perquenco", "Pitrufquén", "Pucón", "Purén", "Renaico", "Saavedra", "Temuco", "Teodoro Schmidt", "Toltén", "Traiguén", "Victoria", "Vilcún", "Villarrica"],
    "Los Ríos": ["Corral", "Futrono", "La Unión", "Lago Ranco", "Lanco", "Los Lagos", "Máfil", "Mariquina", "Paillaco", "Panguipulli", "Río Bueno", "Valdivia"],
    "Los Lagos": ["Ancud", "Calbuco", "Castro", "Chaitén", "Chonchi", "Cochamó", "Curaco de Vélez", "Dalcahue", "Fresia", "Frutillar", "Futaleufú", "Hualaihué", "Llanquihue", "Los Muermos", "Maullín", "Osorno", "Palena", "Puerto Montt", "Puerto Octay", "Puerto Varas", "Puqueldón", "Purranque", "Puyehue", "Queilén", "Quellón", "Quemchi", "Quinchao", "Río Negro", "San Juan de la Costa", "San Pablo"],
    "Aysén": ["Aysén", "Chile Chico", "Cisnes", "Cochrane", "Coyhaique", "Guaitecas", "Lago Verde", "O'Higgins", "Río Ibáñez", "Tortel"],
    "Magallanes": ["Antártica", "Cabo de Hornos", "Laguna Blanca", "Natales", "Porvenir", "Primavera", "Punta Arenas", "Río Verde", "San Gregorio", "Timaukel", "Torres del Paine"],
};

export const SOUTH_AMERICA_CITIES: Record<string, string[]> = {
    "Argentina": [
        // Buenos Aires (CABA)
        "Buenos Aires",
        // Buenos Aires (provincia)
        "La Plata", "Mar del Plata", "Bahía Blanca", "Quilmes", "Lanús", "Lomas de Zamora",
        "General San Martín", "Morón", "Almirante Brown", "Berazategui", "Florencio Varela",
        "Tigre", "San Isidro", "Vicente López", "Avellaneda", "Tres de Febrero", "Merlo",
        "Moreno", "La Matanza", "Pilar", "Esteban Echeverría", "Hurlingham", "Ituzaingó",
        "José C. Paz", "San Miguel", "Malvinas Argentinas", "Zárate", "Campana", "Luján",
        "Mercedes", "San Nicolás de los Arroyos", "Pergamino", "Tandil", "Necochea",
        // Córdoba
        "Córdoba", "Villa María", "Río Cuarto", "San Francisco", "Villa Carlos Paz",
        "Alta Gracia", "Bell Ville", "Cosquín", "Cruz del Eje",
        // Santa Fe
        "Rosario", "Santa Fe", "Rafaela", "Venado Tuerto", "Santo Tomé", "Reconquista",
        // Mendoza
        "Mendoza", "San Rafael", "Godoy Cruz", "Luján de Cuyo", "Guaymallén", "Maipú",
        // Tucumán
        "San Miguel de Tucumán", "Yerba Buena", "Tafí Viejo", "Concepción",
        // Entre Ríos
        "Paraná", "Concordia", "Gualeguaychú", "Colón",
        // Salta
        "Salta", "Orán", "Tartagal", "Metán",
        // Misiones
        "Posadas", "Oberá", "Eldorado", "Puerto Iguazú",
        // Chaco
        "Resistencia", "Presidencia Roque Sáenz Peña", "Villa Ángela",
        // Corrientes
        "Corrientes", "Goya", "Paso de los Libres",
        // Santiago del Estero
        "Santiago del Estero", "La Banda", "Termas de Río Hondo",
        // Neuquén
        "Neuquén", "San Martín de los Andes", "Villa La Angostura", "Zapala",
        // Río Negro
        "Bariloche", "General Roca", "Viedma", "Cipolletti",
        // Jujuy
        "San Salvador de Jujuy", "Palpalá", "Humahuaca",
        // San Juan
        "San Juan", "Caucete",
        // San Luis
        "San Luis", "Villa Mercedes",
        // La Pampa
        "Santa Rosa", "General Pico",
        // La Rioja
        "La Rioja", "Chilecito",
        // Catamarca
        "San Fernando del Valle de Catamarca", "Andalgalá",
        // Formosa
        "Formosa", "Clorinda",
        // Chubut
        "Comodoro Rivadavia", "Trelew", "Puerto Madryn", "Rawson", "Esquel",
        // Santa Cruz
        "Río Gallegos", "Caleta Olivia", "El Calafate",
        // Tierra del Fuego
        "Ushuaia", "Río Grande",
    ],
    "Bolivia": [
        // La Paz
        "La Paz", "El Alto", "Viacha", "Caranavi", "Copacabana",
        // Santa Cruz
        "Santa Cruz de la Sierra", "Montero", "Warnes", "La Guardia", "Camiri", "Yacuiba",
        // Cochabamba
        "Cochabamba", "Sacaba", "Quillacollo", "Punata", "Cliza",
        // Potosí
        "Potosí", "Villazón", "Uyuni", "Tupiza", "Llallagua",
        // Oruro
        "Oruro", "Huanuni", "Caracollo",
        // Tarija
        "Tarija", "Bermejo",
        // Chuquisaca
        "Sucre", "Camargo", "Monteagudo",
        // Beni
        "Trinidad", "Riberalta", "Guayaramerín",
        // Pando
        "Cobija",
    ],
    "Brasil": [
        "São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte",
        "Manaus", "Curitiba", "Recife", "Porto Alegre", "Belém", "Goiânia", "Guarulhos",
        "Campinas", "São Luís", "Maceió", "Natal", "Teresina", "Campo Grande", "João Pessoa",
        "Aracaju", "Cuiabá", "Macapá", "Porto Velho", "Rio Branco", "Florianópolis", "Palmas",
    ],
    "Colombia": [
        // Bogotá D.C.
        "Bogotá",
        // Antioquia
        "Medellín", "Bello", "Itagüí", "Envigado", "Apartadó", "Turbo", "Rionegro", "Caucasia",
        // Valle del Cauca
        "Cali", "Buenaventura", "Palmira", "Tuluá", "Cartago", "Buga",
        // Atlántico
        "Barranquilla", "Soledad", "Malambo",
        // Bolívar
        "Cartagena", "Magangué",
        // Santander
        "Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja",
        // Córdoba
        "Montería", "Lorica", "Cereté",
        // Cundinamarca
        "Soacha", "Facatativá", "Zipaquirá", "Chía", "Fusagasugá", "Mosquera",
        // Norte de Santander
        "Cúcuta", "Ocaña", "Pamplona",
        // Nariño
        "Pasto", "Tumaco", "Ipiales",
        // Boyacá
        "Tunja", "Duitama", "Sogamoso", "Chiquinquirá",
        // Huila
        "Neiva", "Pitalito", "Garzón",
        // Tolima
        "Ibagué", "Espinal", "Melgar",
        // Cauca
        "Popayán", "Santander de Quilichao",
        // Meta
        "Villavicencio", "Acacías",
        // Risaralda
        "Pereira", "Dosquebradas",
        // Caldas
        "Manizales", "La Dorada",
        // Quindío
        "Armenia", "Calarcá",
        // Magdalena
        "Santa Marta", "Ciénaga",
        // Cesar
        "Valledupar", "Aguachica",
        // Sucre
        "Sincelejo", "Corozal",
        // La Guajira
        "Riohacha", "Maicao",
        // Chocó
        "Quibdó",
        // Amazonas
        "Leticia",
    ],
    "Ecuador": [
        "Quito", "Guayaquil", "Cuenca", "Santo Domingo", "Machala", "Durán", "Manta",
        "Portoviejo", "Loja", "Ambato", "Esmeraldas", "Quevedo", "Riobamba", "Milagro", "Ibarra", "Babahoyo",
    ],
    "Paraguay": [
        "Asunción", "Ciudad del Este", "San Lorenzo", "Luque", "Capiatá", "Lambaré",
        "Fernando de la Mora", "Limpio", "Ñemby", "Encarnación", "Pedro Juan Caballero", "Concepción",
    ],
    "Perú": [
        // Lima
        "Lima", "Callao", "San Juan de Lurigancho", "San Martín de Porres", "Villa El Salvador",
        "Villa María del Triunfo", "Comas", "Surco", "San Borja", "Miraflores", "Los Olivos",
        "Independencia", "Ate", "Santa Anita", "El Agustino", "Chorrillos", "Lince", "Barranco",
        // Arequipa
        "Arequipa", "Cayma", "Cerro Colorado", "Paucarpata", "Socabaya", "Mariano Melgar", "Hunter",
        // La Libertad
        "Trujillo", "El Porvenir", "Florencia de Mora", "La Esperanza", "Víctor Larco Herrera",
        // Lambayeque
        "Chiclayo", "Ferreñafe", "Lambayeque", "José Leonardo Ortiz",
        // Piura
        "Piura", "Castilla", "Sullana", "Talara", "Paita", "Chulucanas",
        // Loreto
        "Iquitos", "Nauta", "Yurimaguas",
        // Cusco
        "Cusco", "Wanchaq", "San Jerónimo", "Santiago", "Sicuani", "Espinar",
        // Áncash
        "Chimbote", "Nuevo Chimbote", "Huaraz", "Casma",
        // Junín
        "Huancayo", "El Tambo", "Chilca", "Tarma", "La Oroya", "Jauja",
        // Tacna
        "Tacna", "Alto de la Alianza", "Ciudad Nueva",
        // Puno
        "Juliaca", "Puno", "Ilave",
        // Ica
        "Ica", "Chincha Alta", "Pisco", "Nasca",
        // Ucayali
        "Pucallpa",
        // Ayacucho
        "Ayacucho", "Huanta",
        // Cajamarca
        "Cajamarca", "Jaén", "Chota",
        // San Martín
        "Tarapoto", "Moyobamba", "Juanjuí",
        // Huánuco
        "Huánuco", "Tingo María",
        // Apurímac
        "Abancay", "Andahuaylas",
        // Amazonas
        "Chachapoyas", "Bagua",
        // Moquegua
        "Moquegua", "Ilo",
        // Madre de Dios
        "Puerto Maldonado",
    ],
    "Uruguay": [
        "Montevideo", "Salto", "Paysandú", "Las Piedras", "Rivera", "Maldonado", "Tacuarembó",
        "Melo", "Mercedes", "Artigas", "Minas", "San José de Mayo", "Durazno", "Florida", "Treinta y Tres",
    ],
    "Venezuela": [
        "Caracas", "Maracaibo", "Valencia", "Barquisimeto", "Maracay", "Ciudad Guayana",
        "San Cristóbal", "Maturín", "Ciudad Bolívar", "Cumaná", "Barcelona", "Mérida", "Barinas",
    ],
    "Guyana": ["Georgetown", "Linden", "New Amsterdam", "Anna Regina", "Bartica"],
    "Surinam": ["Paramaribo", "Lelydorp", "Nieuw Nickerie", "Moengo", "Marienburg"],
};

export const SOUTH_AMERICA_COUNTRIES = [
    "Chile",
    "Argentina",
    "Bolivia",
    "Brasil",
    "Colombia",
    "Ecuador",
    "Paraguay",
    "Perú",
    "Uruguay",
    "Venezuela",
    "Guyana",
    "Surinam",
];
