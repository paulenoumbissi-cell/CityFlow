import { broadcastEmergencyUpdate, broadcastEmergencyCancel } from "../services/websocketServer.js";
import dbService from "../services/dbService.js";
import { CITY_LANDMARKS, fetchOsrmRoutes } from "./routeController.js";

// Contrôleur de gestion des missions de secours & régulation d'onde verte (Green Wave) dynamique

// Base de données des hôpitaux et pôles d'urgences de référence
export const EMERGENCY_HOSPITALS_DB = {
  "Yaoundé": [
    {
      id: "hosp_yde_central",
      name: "Hôpital Central de Yaoundé (HCY)",
      category: "CHU & Traumatologie Lourde",
      badge: "Pôle Déchocage Niveau 1",
      district: "Centre / Boulevard 20 Mai",
      position: [3.8650, 11.5080],
      phone: "+237 222 23 40 20",
      hotline: "119",
      bedsAvailable: 14,
      totalBeds: 24,
      occupancyRate: 72,
      status: "available", // available | high_load | saturated
      specialties: ["Urgences vitales", "Chirurgie traumatique", "Réanimation", "Déchocage 24/7"],
      etaMinutesDefault: 8,
    },
    {
      id: "hosp_yde_chuy",
      name: "Centre Hospitalier Universitaire (CHUY)",
      category: "Urgences Universitaires & Réanimation",
      badge: "Neurochirurgie & Soins Intensifs",
      district: "Melen / Polytechnique",
      position: [3.8550, 11.4920],
      phone: "+237 222 22 28 80",
      hotline: "119",
      bedsAvailable: 8,
      totalBeds: 18,
      occupancyRate: 85,
      status: "available",
      specialties: ["Cardiologie d'urgence", "Neuro-traumatologie", "Brûlés graves"],
      etaMinutesDefault: 10,
    },
    {
      id: "hosp_yde_general",
      name: "Hôpital Général de Yaoundé (HGY)",
      category: "Pôle Spécialisé Haut Standing",
      badge: "Grands Brûlés & Imagerie 24/7",
      district: "Ngousso",
      position: [3.8980, 11.5430],
      phone: "+237 222 20 28 01",
      hotline: "119",
      bedsAvailable: 12,
      totalBeds: 20,
      occupancyRate: 68,
      status: "available",
      specialties: ["Chirurgie cardiaque", "Oncologie d'urgence", "Soins intensifs pédiatriques"],
      etaMinutesDefault: 12,
    },
    {
      id: "hosp_yde_hgopy",
      name: "Hôpital Gynéco-Obstétrique (HGOPY)",
      category: "Centre Mère & Enfant",
      badge: "Néonatologie d'Urgence",
      district: "Ngousso / Biyem",
      position: [3.8410, 11.5620],
      phone: "+237 222 21 24 30",
      hotline: "119",
      bedsAvailable: 6,
      totalBeds: 15,
      occupancyRate: 88,
      status: "available",
      specialties: ["Urgences obstétricales", "Pédiatrie d'extrême urgence", "Couveuses réa"],
      etaMinutesDefault: 14,
    },
    {
      id: "hosp_yde_militaire",
      name: "Hôpital Militaire de Région n°1",
      category: "Hôpital d'Instruction Militaire",
      badge: "Chirurgie Tactique & Balistique",
      district: "Ngoa-Ekélé / Centre",
      position: [3.8590, 11.5160],
      phone: "+237 222 23 11 00",
      hotline: "117",
      bedsAvailable: 11,
      totalBeds: 16,
      occupancyRate: 60,
      status: "available",
      specialties: ["Traumatisme de guerre", "Chirurgie polyvalente", "Banque de sang"],
      etaMinutesDefault: 7,
    },
  ],
  "Douala": [
    {
      id: "hosp_dla_laquintinie",
      name: "Hôpital Laquintinie de Douala",
      category: "Centre Hospitalier Régional N°1",
      badge: "Pavillon Samuel Kondo (Urgences)",
      district: "Akwa / Deido",
      position: [4.0550, 9.7020],
      phone: "+237 233 42 15 40",
      hotline: "119",
      bedsAvailable: 16,
      totalBeds: 30,
      occupancyRate: 75,
      status: "available",
      specialties: ["Pavillon des urgences 24/7", "Déchocage adulte/enfant", "Scanner d'urgence"],
      etaMinutesDefault: 8,
    },
    {
      id: "hosp_dla_general",
      name: "Hôpital Général de Douala (HGD)",
      category: "Pôle Hospitalier Universitaire",
      badge: "Grands Brûlés & Hémodialyse Urgence",
      district: "Logbessou",
      position: [4.0620, 9.7480],
      phone: "+237 233 46 25 15",
      hotline: "119",
      bedsAvailable: 10,
      totalBeds: 22,
      occupancyRate: 80,
      status: "available",
      specialties: ["Réanimation médico-chirurgicale", "Cardiologie interventionnelle"],
      etaMinutesDefault: 11,
    },
    {
      id: "hosp_dla_militaire",
      name: "Hôpital Militaire de Région n°2",
      category: "Urgences Tactiques & Armées",
      badge: "Bloc Opératoire d'Urgence",
      district: "Bonanjo",
      position: [4.0420, 9.6950],
      phone: "+237 233 42 09 88",
      hotline: "117",
      bedsAvailable: 7,
      totalBeds: 14,
      occupancyRate: 65,
      status: "available",
      specialties: ["Chirurgie d'urgence", "Soins intensifs", "Traumatologie"],
      etaMinutesDefault: 9,
    },
    {
      id: "hosp_dla_muna",
      name: "Clinique Muna de Bonanjo",
      category: "Clinique Médico-Chirurgicale Privée",
      badge: "Prise en charge Immédiate VIP",
      district: "Bonanjo",
      position: [4.0410, 9.6980],
      phone: "+237 233 42 42 00",
      hotline: "119",
      bedsAvailable: 5,
      totalBeds: 10,
      occupancyRate: 70,
      status: "available",
      specialties: ["Unité de soins intensifs", "Ambulance médicalisée privée"],
      etaMinutesDefault: 10,
    },
    {
      id: "hosp_dla_bonassama",
      name: "Hôpital de District de Bonassama",
      category: "Hôpital Public Douala Ouest",
      badge: "Urgences Rive Droite Wouri",
      district: "Bonabéri",
      position: [4.0750, 9.6640],
      phone: "+237 233 39 12 04",
      hotline: "119",
      bedsAvailable: 9,
      totalBeds: 18,
      occupancyRate: 78,
      status: "available",
      specialties: ["Urgences de proximité Bonabéri", "Traumatologie routière N5"],
      etaMinutesDefault: 12,
    },
  ],
};

// Corridors préconfigurés haute vitesse
const EMERGENCY_CORRIDORS_DB = {
  "Yaoundé": [
    {
      id: "yde_corridor_hopital_central",
      name: "Corridor Nord ➔ Hôpital Central de Yaoundé",
      origin: "Caserne Sapeurs-Pompiers Nlongkak",
      destination: "Urgences - Hôpital Central de Yaoundé",
      distanceKm: 5.4,
      nominalDurationMinutes: 24,
      priorityDurationMinutes: 8,
      timeSavedMinutes: 16,
      coordinates: [[3.882014,11.516981],[3.882087,11.517037],[3.882261,11.51719],[3.88237,11.517301],[3.882464,11.517404],[3.882556,11.517519],[3.882955,11.517969],[3.883564,11.518756],[3.883655,11.518911],[3.883683,11.518954],[3.883768,11.519086],[3.883767,11.519234],[3.883816,11.519374],[3.883883,11.519463],[3.883971,11.519532],[3.884074,11.519575],[3.884204,11.51959],[3.884292,11.519577],[3.884375,11.519546],[3.88445,11.519498],[3.884513,11.519437],[3.884559,11.519371],[3.884591,11.519297],[3.884608,11.51922],[3.88461,11.519122],[3.88459,11.519026],[3.884548,11.518938],[3.884487,11.518861],[3.88441,11.5188],[3.884328,11.518761],[3.88424,11.51874],[3.884149,11.518738],[3.884059,11.518756],[3.883976,11.518792],[3.883821,11.518761],[3.883721,11.518729],[3.88365,11.518698],[3.883588,11.51865],[3.883456,11.518499],[3.883348,11.518367],[3.883233,11.518227],[3.882969,11.517881],[3.882957,11.517864],[3.882668,11.517511],[3.88254,11.517382],[3.882292,11.517128],[3.882104,11.516963],[3.881866,11.516785],[3.881667,11.516655],[3.881543,11.516585],[3.881505,11.516568],[3.881369,11.516505],[3.881292,11.516475],[3.881219,11.516445],[3.880958,11.516369],[3.880774,11.516324],[3.880446,11.516275],[3.880051,11.516224],[3.879765,11.516173],[3.879558,11.516129],[3.879297,11.516068],[3.879149,11.516023],[3.879047,11.515997],[3.878848,11.515948],[3.878788,11.515972],[3.878608,11.51594],[3.878561,11.515931],[3.8783,11.515865],[3.877812,11.515742],[3.876891,11.515512],[3.876265,11.51536],[3.875594,11.515178],[3.875539,11.515166],[3.875327,11.515118],[3.875113,11.515076],[3.874957,11.515043],[3.874819,11.515018],[3.874788,11.515012],[3.873892,11.514934],[3.87359,11.514907],[3.873387,11.51489],[3.871998,11.514796],[3.871785,11.514689],[3.871733,11.514667],[3.871667,11.514645],[3.871585,11.514648],[3.871507,11.514659],[3.871409,11.514668],[3.871381,11.514673],[3.871217,11.514703],[3.871009,11.51474],[3.870758,11.514777],[3.870723,11.514775],[3.870536,11.514762],[3.870372,11.514744],[3.870254,11.514727],[3.870085,11.514695],[3.870022,11.514674],[3.869739,11.51447],[3.869556,11.514303],[3.869492,11.514235],[3.869413,11.514156],[3.869294,11.514056],[3.869155,11.51397],[3.869012,11.513929],[3.868869,11.513889],[3.868762,11.513865],[3.868443,11.513837],[3.868068,11.513771],[3.867643,11.513646],[3.867186,11.513471],[3.866893,11.513358],[3.86668,11.513237],[3.866619,11.513205],[3.866617,11.51318],[3.866612,11.513164],[3.866601,11.513134],[3.866573,11.513091],[3.866533,11.513059],[3.866487,11.513047],[3.866439,11.513025],[3.866404,11.512867],[3.866363,11.512703],[3.866327,11.512562],[3.866249,11.512474],[3.866188,11.512422],[3.866091,11.512361],[3.86588,11.512275],[3.865808,11.512231],[3.865766,11.512191],[3.865739,11.512146],[3.865715,11.512101],[3.865693,11.512051],[3.865677,11.511998],[3.865671,11.511944],[3.865672,11.511898],[3.864875,11.511878],[3.864689,11.51185],[3.864484,11.511853],[3.864291,11.511846],[3.864267,11.511833],[3.864241,11.511831],[3.864219,11.511837],[3.864109,11.511836],[3.863896,11.511836],[3.863833,11.511839],[3.863633,11.511845],[3.863271,11.511892],[3.862718,11.511956],[3.862563,11.511967],[3.862422,11.511948],[3.862283,11.511898],[3.862206,11.511864],[3.862057,11.511745],[3.86202,11.511701],[3.862039,11.511683],[3.86205,11.511658],[3.862048,11.511632],[3.86202,11.511594],[3.862116,11.511519],[3.862579,11.511059],[3.862863,11.510836],[3.862969,11.510703],[3.863024,11.510624],[3.86315,11.510426],[3.863256,11.510268],[3.863324,11.510184],[3.863399,11.510118],[3.863476,11.510063],[3.863737,11.509925],[3.863973,11.509793],[3.864161,11.509653],[3.864272,11.509553],[3.864371,11.509446],[3.864532,11.50926],[3.864571,11.509222],[3.864615,11.509185],[3.864647,11.509165],[3.864711,11.509134],[3.864845,11.509109],[3.864996,11.509109],[3.865166,11.509116],[3.865272,11.509138],[3.865416,11.509199],[3.865443,11.509022],[3.865383,11.508653],[3.865314,11.508328],[3.86525,11.508091],[3.86524,11.507979]],
      intersections: [
        { id: "int_yde_1", name: "Carrefour Nlongkak", position: [3.8820, 11.5170], state: "green_wave", crossTrafficLight: "red" },
        { id: "int_yde_2", name: "Carrefour Warda / Mfoundi", position: [3.8730, 11.5180], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_3", name: "Poste Centrale (Bld 20 Mai)", position: [3.8640, 11.5190], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_4", name: "Carrefour Hôpital Central", position: [3.8590, 11.5130], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_4b", name: "Entrée Pavillon Urgences HCY", position: [3.8650, 11.5080], state: "pending", crossTrafficLight: "red" },
      ],
    },
    {
      id: "yde_corridor_chuy",
      name: "Corridor Ouest ➔ CHU de Melen (CHUY)",
      origin: "Poste Centrale",
      destination: "Centre Hospitalier Universitaire (CHUY)",
      distanceKm: 6.1,
      nominalDurationMinutes: 28,
      priorityDurationMinutes: 9,
      timeSavedMinutes: 19,
      coordinates: [[3.86404,11.518955],[3.864118,11.519024],[3.864802,11.518293],[3.865158,11.517927],[3.865579,11.517508],[3.865658,11.517445],[3.866221,11.517189],[3.866823,11.516909],[3.867124,11.516847],[3.867146,11.516851],[3.867169,11.516849],[3.867205,11.516834],[3.867233,11.516805],[3.867246,11.516776],[3.867248,11.516744],[3.867243,11.516719],[3.867232,11.516697],[3.867216,11.516678],[3.867184,11.516659],[3.867146,11.516652],[3.866985,11.516509],[3.866838,11.516298],[3.866549,11.515883],[3.866461,11.515672],[3.866433,11.515512],[3.866496,11.515434],[3.866528,11.515376],[3.86656,11.515304],[3.866577,11.515219],[3.866574,11.515165],[3.866559,11.515118],[3.866531,11.515075],[3.866497,11.515043],[3.866431,11.515008],[3.86638,11.514994],[3.866331,11.514989],[3.866206,11.514876],[3.86616,11.514822],[3.866185,11.514664],[3.866206,11.514531],[3.866355,11.513589],[3.866368,11.513512],[3.86646,11.51339],[3.866511,11.513376],[3.866556,11.513348],[3.866591,11.513307],[3.866613,11.513258],[3.866619,11.513205],[3.866617,11.51318],[3.866612,11.513164],[3.866601,11.513134],[3.866696,11.513041],[3.866831,11.512918],[3.867004,11.512794],[3.867284,11.512592],[3.867526,11.51247],[3.867594,11.512498],[3.867673,11.512492],[3.8677,11.512479],[3.867724,11.51246],[3.867744,11.512437],[3.867758,11.512409],[3.867765,11.512384],[3.867768,11.512357],[3.867763,11.512315],[3.867745,11.512277],[3.867719,11.512246],[3.867685,11.512224],[3.86787,11.511889],[3.868452,11.511095],[3.86855,11.510923],[3.869033,11.509977],[3.86919,11.509648],[3.869229,11.509557],[3.869256,11.509503],[3.869527,11.50893],[3.869848,11.508297],[3.869884,11.508217],[3.869922,11.508094],[3.869982,11.507978],[3.870037,11.507891],[3.870238,11.507633],[3.870449,11.507419],[3.870541,11.507315],[3.870869,11.506951],[3.871,11.506805],[3.871399,11.50628],[3.871594,11.506023],[3.871725,11.505855],[3.871813,11.50574],[3.871862,11.505594],[3.871916,11.505532],[3.871997,11.505351],[3.872087,11.505146],[3.87221,11.504862],[3.8723,11.504609],[3.872344,11.504396],[3.872392,11.504159],[3.872435,11.503846],[3.872478,11.503542],[3.872539,11.503023],[3.872578,11.502704],[3.872603,11.502491],[3.872614,11.502394],[3.872621,11.502335],[3.872654,11.501952],[3.872686,11.501669],[3.872755,11.501103],[3.872756,11.500994],[3.872788,11.50064],[3.872864,11.500232],[3.872919,11.499893],[3.872949,11.49962],[3.872978,11.499318],[3.872991,11.499141],[3.872981,11.499013],[3.872965,11.49895],[3.872938,11.498863],[3.872758,11.498294],[3.872666,11.498092],[3.872521,11.497804],[3.872302,11.497721],[3.872169,11.497706],[3.871969,11.497704],[3.871823,11.497742],[3.871656,11.497777],[3.871479,11.497833],[3.871368,11.497874],[3.871304,11.497898],[3.870971,11.498059],[3.870843,11.498121],[3.870672,11.498196],[3.870314,11.498348],[3.870172,11.498404],[3.870035,11.498443],[3.869943,11.498391],[3.86982,11.498298],[3.869733,11.498197],[3.86972,11.498175],[3.869319,11.497628],[3.869285,11.497581],[3.868832,11.496966],[3.868376,11.496341],[3.868202,11.496144],[3.868036,11.496048],[3.867747,11.495976],[3.8675,11.49594],[3.867435,11.49593],[3.867129,11.495899],[3.866887,11.495973],[3.866864,11.49598],[3.866819,11.495995],[3.866687,11.496038],[3.866502,11.496099],[3.866441,11.496119],[3.866398,11.496133],[3.866322,11.496158],[3.866293,11.496167],[3.866214,11.496192],[3.865911,11.496287],[3.865794,11.496317],[3.865753,11.496328],[3.865402,11.496433],[3.865322,11.496449],[3.865126,11.49649],[3.865032,11.496509],[3.8643,11.496547],[3.864221,11.496548],[3.864149,11.49655],[3.864112,11.496546],[3.864093,11.496546],[3.864035,11.496574],[3.864018,11.496338],[3.863933,11.495743],[3.863902,11.495531],[3.863889,11.495482],[3.863855,11.495383],[3.863803,11.495236],[3.86365,11.494948],[3.863475,11.494737],[3.863339,11.494571],[3.863019,11.494184],[3.862916,11.494106],[3.862906,11.494096],[3.862807,11.494022],[3.862612,11.493905],[3.862527,11.493867],[3.862483,11.493838],[3.862289,11.493727],[3.861904,11.493522],[3.861653,11.49344],[3.861458,11.493392],[3.861366,11.493369],[3.861185,11.493367],[3.860785,11.493347],[3.860073,11.493316],[3.859767,11.493268],[3.859646,11.493249],[3.859308,11.493184],[3.859271,11.493177],[3.858381,11.492895],[3.858237,11.492848],[3.858042,11.492775],[3.857856,11.492705],[3.857745,11.492664],[3.857523,11.492567],[3.857427,11.492532],[3.85733,11.492513],[3.857308,11.492462],[3.857265,11.49245],[3.85722,11.492461],[3.857188,11.492494],[3.857177,11.492539],[3.857189,11.492582],[3.857109,11.49267],[3.857026,11.492786],[3.856884,11.492861],[3.856769,11.492918],[3.856274,11.493048],[3.85608,11.49308],[3.856052,11.493087],[3.85606,11.492788],[3.856088,11.492619],[3.856118,11.492523],[3.856162,11.492451],[3.85604,11.492403],[3.855939,11.492388],[3.855769,11.492375],[3.855551,11.492374],[3.855221,11.492379],[3.85501,11.492361],[3.854971,11.492358]],
      intersections: [
        { id: "int_yde_5", name: "Poste Centrale", position: [3.8640, 11.5190], state: "green_wave", crossTrafficLight: "red" },
        { id: "int_yde_6", name: "Carrefour Bastos / Tsinga", position: [3.8690, 11.5050], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_7", name: "Carrefour Melen (Polytechnique)", position: [3.8610, 11.4980], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_8", name: "Entrée Urgences CHUY", position: [3.8550, 11.4920], state: "pending", crossTrafficLight: "red" },
      ],
    },
    {
      id: "yde_corridor_ngousso",
      name: "Corridor Est ➔ Hôpital Général de Yaoundé",
      origin: "Poste Centrale (Bld 20 Mai)",
      destination: "Hôpital Général de Yaoundé (Ngousso)",
      distanceKm: 7.6,
      nominalDurationMinutes: 32,
      priorityDurationMinutes: 11,
      timeSavedMinutes: 21,
      coordinates: [[3.86404,11.518955],[3.864118,11.519024],[3.863336,11.51986],[3.863286,11.519913],[3.863385,11.519981],[3.863434,11.520004],[3.863489,11.520024],[3.863569,11.520044],[3.863826,11.520098],[3.864469,11.520214],[3.865044,11.520343],[3.865452,11.520415],[3.865658,11.520452],[3.865942,11.520515],[3.866212,11.52056],[3.866246,11.520581],[3.866279,11.520617],[3.866415,11.520551],[3.866431,11.520575],[3.866457,11.520592],[3.866474,11.520611],[3.866507,11.520618],[3.866536,11.520616],[3.866564,11.520605],[3.866594,11.52058],[3.867599,11.521341],[3.867886,11.521558],[3.868614,11.522086],[3.869356,11.522609],[3.869848,11.522972],[3.870534,11.523472],[3.870582,11.523566],[3.87062,11.523632],[3.870677,11.523719],[3.870651,11.523747],[3.870636,11.523782],[3.870633,11.523823],[3.870644,11.523863],[3.870657,11.523883],[3.87068,11.523907],[3.870709,11.523923],[3.870753,11.52393],[3.870797,11.523921],[3.870835,11.523896],[3.871065,11.523968],[3.871166,11.52396],[3.871196,11.52398],[3.871229,11.524002],[3.871494,11.524109],[3.871744,11.524843],[3.871846,11.525173],[3.871879,11.525294],[3.871962,11.525568],[3.872079,11.525872],[3.872101,11.525917],[3.872184,11.526011],[3.87235,11.52615],[3.872507,11.526278],[3.87285,11.526553],[3.872944,11.526638],[3.873022,11.526738],[3.873074,11.526831],[3.873115,11.526927],[3.873278,11.527622],[3.873459,11.528549],[3.873533,11.52893],[3.873553,11.529037],[3.873541,11.529321],[3.873512,11.529334],[3.873491,11.529358],[3.873481,11.529389],[3.873485,11.529421],[3.873501,11.529449],[3.873536,11.529468],[3.873575,11.529473],[3.873609,11.529456],[3.873631,11.529425],[3.873763,11.529484],[3.873945,11.529595],[3.874146,11.529686],[3.874405,11.529785],[3.874533,11.529836],[3.874683,11.529905],[3.874833,11.530021],[3.87508,11.530212],[3.875287,11.530408],[3.875491,11.530634],[3.87607,11.531339],[3.876528,11.53185],[3.876894,11.532176],[3.877214,11.532431],[3.877236,11.532449],[3.877474,11.532618],[3.87771,11.532784],[3.878159,11.53301],[3.878498,11.53318],[3.879144,11.533504],[3.879777,11.533809],[3.880227,11.53403],[3.880305,11.534069],[3.880416,11.53411],[3.880587,11.534169],[3.880805,11.534232],[3.881144,11.53432],[3.881186,11.534328],[3.881664,11.534418],[3.882159,11.534511],[3.882438,11.534567],[3.882577,11.534595],[3.882809,11.534642],[3.882999,11.534691],[3.883158,11.534739],[3.883286,11.534783],[3.883506,11.534864],[3.883719,11.534951],[3.885025,11.53558],[3.885784,11.535937],[3.885942,11.536011],[3.886132,11.536275],[3.886132,11.536379],[3.886143,11.536578],[3.886159,11.53663],[3.886193,11.536677],[3.886225,11.536697],[3.886232,11.536701],[3.886319,11.536691],[3.886336,11.536766],[3.886445,11.537143],[3.886523,11.537459],[3.886713,11.538189],[3.886814,11.538562],[3.887048,11.539547],[3.887254,11.540289],[3.887399,11.540945],[3.887443,11.541146],[3.887527,11.541583],[3.887574,11.541858],[3.887642,11.54241],[3.887739,11.543286],[3.887788,11.543671],[3.887852,11.544029],[3.887904,11.544259],[3.888102,11.544716],[3.888162,11.544869],[3.888182,11.545063],[3.888198,11.545149],[3.888188,11.545187],[3.888189,11.545228],[3.888204,11.545274],[3.888233,11.545313],[3.888273,11.545341],[3.888319,11.545354],[3.888364,11.545353],[3.888406,11.545339],[3.888442,11.545314],[3.888827,11.54532],[3.888855,11.545266],[3.888927,11.545109],[3.889014,11.544978],[3.889403,11.544469],[3.88977,11.544017],[3.890084,11.5436],[3.890147,11.54352],[3.89035,11.543297],[3.890456,11.543194],[3.890799,11.542766],[3.891344,11.542629],[3.891839,11.542581],[3.892047,11.542541],[3.892224,11.542496],[3.892373,11.542457],[3.892502,11.542425],[3.892613,11.54239],[3.892835,11.542302],[3.892875,11.542287],[3.893349,11.542099],[3.893819,11.541898],[3.894117,11.541761],[3.894407,11.541653],[3.894831,11.541494],[3.894932,11.541456],[3.894996,11.541434],[3.895763,11.541175],[3.896129,11.541034],[3.89625,11.540981],[3.896472,11.540865],[3.896842,11.540714],[3.89734,11.540543],[3.897547,11.541076],[3.897579,11.541158],[3.897867,11.541935],[3.898031,11.542387],[3.898225,11.542918]],
      intersections: [
        { id: "int_yde_9", name: "Poste Centrale", position: [3.8640, 11.5190], state: "green_wave", crossTrafficLight: "red" },
        { id: "int_yde_10", name: "Carrefour Elig-Essono", position: [3.8710, 11.5240], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_11", name: "Carrefour Omnisports", position: [3.8810, 11.5360], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_12", name: "Carrefour Ngousso / Hôpital Général", position: [3.8980, 11.5430], state: "pending", crossTrafficLight: "red" },
      ],
    },
  ],
  "Douala": [
    {
      id: "dla_corridor_laquintinie",
      name: "Corridor Nord-Sud ➔ Hôpital Laquintinie",
      origin: "Caserne Sapeurs-Pompiers Deido",
      destination: "Urgences - Hôpital Laquintinie",
      distanceKm: 4.8,
      nominalDurationMinutes: 26,
      priorityDurationMinutes: 7,
      timeSavedMinutes: 19,
      coordinates: [[4.061476,9.711551],[4.061388,9.711654],[4.060541,9.712575],[4.060289,9.712377],[4.059678,9.711781],[4.059464,9.711555],[4.059435,9.711521],[4.059412,9.711494],[4.059367,9.711431],[4.05931,9.711351],[4.059321,9.71132],[4.059325,9.711287],[4.059322,9.711254],[4.059308,9.711212],[4.059282,9.711175],[4.059248,9.711147],[4.059207,9.711129],[4.059172,9.711123],[4.059137,9.711125],[4.059078,9.711101],[4.059039,9.711076],[4.058981,9.711022],[4.058946,9.710984],[4.058835,9.710867],[4.058745,9.710765],[4.058001,9.709898],[4.057805,9.709674],[4.05764,9.709481],[4.057279,9.70905],[4.056741,9.70842],[4.056609,9.708281],[4.056465,9.708126],[4.056375,9.70803],[4.055482,9.707003],[4.055388,9.706891],[4.055381,9.706882],[4.054491,9.705864],[4.054318,9.705654],[4.054189,9.705508],[4.054046,9.705332],[4.053762,9.705017],[4.053485,9.704698],[4.053442,9.704648],[4.053362,9.70458],[4.053286,9.704521],[4.05338,9.704422],[4.053643,9.704175],[4.055791,9.702121],[4.055317,9.701667]],
      intersections: [
        { id: "int_dla_1", name: "Rond-point Deido", position: [4.0620, 9.7120], state: "green_wave", crossTrafficLight: "red" },
        { id: "int_dla_2", name: "Carrefour Akwa Palace", position: [4.0530, 9.7080], state: "pending", crossTrafficLight: "red" },
        { id: "int_dla_3", name: "Boulevard de la Liberté", position: [4.0480, 9.7010], state: "pending", crossTrafficLight: "red" },
        { id: "int_dla_4", name: "Accès Urgences Laquintinie", position: [4.0550, 9.7020], state: "pending", crossTrafficLight: "red" },
      ],
    },
    {
      id: "dla_corridor_hopital_general",
      name: "Corridor Est ➔ Hôpital Général de Douala",
      origin: "Poste de Commandement Ndokoti",
      destination: "Hôpital Général de Douala (Logbessou)",
      distanceKm: 7.2,
      nominalDurationMinutes: 35,
      priorityDurationMinutes: 11,
      timeSavedMinutes: 24,
      coordinates: [[4.044826,9.742409],[4.046613,9.743175],[4.046326,9.743569],[4.046305,9.743607],[4.046208,9.743796],[4.046186,9.743811],[4.046168,9.743815],[4.046139,9.743815],[4.045026,9.74332],[4.044886,9.743257],[4.044848,9.743256],[4.044818,9.743265],[4.044795,9.743293],[4.044574,9.743695],[4.044612,9.743718],[4.044981,9.743953],[4.045466,9.744265],[4.04606,9.744706],[4.046129,9.744754],[4.046594,9.745107],[4.04717,9.745545],[4.047484,9.745809],[4.047533,9.745857],[4.048215,9.746465],[4.048431,9.746649],[4.048568,9.746763],[4.048642,9.746822],[4.048715,9.746872],[4.049205,9.74712],[4.049268,9.747151],[4.049731,9.747407],[4.050412,9.747768],[4.050444,9.747782],[4.050478,9.747795],[4.050514,9.747805],[4.051222,9.74797],[4.051834,9.748097],[4.052629,9.748277],[4.052715,9.748302],[4.052782,9.748325],[4.052845,9.748351],[4.052943,9.748407],[4.053515,9.748757],[4.053803,9.748939],[4.053857,9.748973],[4.054428,9.74934],[4.054684,9.749487],[4.054867,9.749533],[4.054918,9.749424],[4.054951,9.749371],[4.05498,9.749311],[4.055268,9.748736],[4.055286,9.748702],[4.055312,9.748659],[4.055346,9.74861],[4.055421,9.748523],[4.055541,9.748404],[4.055859,9.748107],[4.05591,9.748059],[4.055959,9.74801],[4.056052,9.747931],[4.056146,9.747827],[4.056258,9.747697],[4.056381,9.747535],[4.05654,9.747345],[4.056638,9.747228],[4.056872,9.746983],[4.05699,9.746882],[4.057201,9.74674],[4.057413,9.74662],[4.057538,9.746557],[4.05767,9.746505],[4.057809,9.746466],[4.057988,9.746425],[4.058236,9.746392],[4.058403,9.746375],[4.05861,9.746341],[4.058729,9.746338],[4.058889,9.746309],[4.059208,9.746233],[4.059391,9.746186],[4.059493,9.746159],[4.059681,9.746109],[4.059793,9.746066],[4.060017,9.745967],[4.06022,9.745863],[4.060548,9.746851],[4.060633,9.747092],[4.060642,9.747108],[4.060657,9.747117],[4.060785,9.747142],[4.060853,9.747154],[4.060952,9.747175],[4.060997,9.747193],[4.061036,9.747226],[4.061259,9.747465],[4.0615,9.747687],[4.061959,9.748052]],
      intersections: [
        { id: "int_dla_5", name: "Carrefour Ndokoti", position: [4.0450, 9.7420], state: "green_wave", crossTrafficLight: "red" },
        { id: "int_dla_6", name: "Axe Lourd Bassa", position: [4.0510, 9.7550], state: "pending", crossTrafficLight: "red" },
        { id: "int_dla_7", name: "Carrefour Cité des Palmiers", position: [4.0610, 9.7680], state: "pending", crossTrafficLight: "red" },
        { id: "int_dla_8", name: "Entrée Hôpital Général Logbessou", position: [4.0620, 9.7480], state: "pending", crossTrafficLight: "red" },
      ],
    },
  ],
};

let activeEmergencyMission = null;

// Helper : Déterminer la coordonnée GPS d'une chaîne ou d'un tableau
function resolveCoordinates(point, cityKey) {
  if (Array.isArray(point) && point.length === 2) {
    return [parseFloat(point[0]), parseFloat(point[1])];
  }
  if (typeof point === "string") {
    // Chercher dans les hôpitaux
    const hospitals = EMERGENCY_HOSPITALS_DB[cityKey] || EMERGENCY_HOSPITALS_DB["Yaoundé"];
    const foundHosp = hospitals.find(
      (h) => h.name.toLowerCase().includes(point.toLowerCase()) || point.toLowerCase().includes(h.name.toLowerCase())
    );
    if (foundHosp) return foundHosp.position;

    // Chercher dans les repères de ville
    const cityLandmarks = CITY_LANDMARKS[cityKey] || CITY_LANDMARKS["Yaoundé"];
    const foundLandmark = Object.entries(cityLandmarks).find(
      ([name]) => name.toLowerCase().includes(point.toLowerCase()) || point.toLowerCase().includes(name.toLowerCase())
    );
    if (foundLandmark) return foundLandmark[1].pos;
  }
  // Par défaut centre ville
  return cityKey === "Douala" ? [4.0511, 9.7043] : [3.8667, 11.5167];
}

// Helper pour calculer la distance euclidienne / haversine
function calculateDistKm(pos1, pos2) {
  const [lat1, lon1] = pos1;
  const [lat2, lon2] = pos2;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper : Créer une mission active
function buildMission({ vehicleType, city, corridorId, origin, destination, customData }) {
  const cityKey = city && city.toLowerCase().includes("douala") ? "Douala" : "Yaoundé";

  const vehicleDetails = {
    ambulance: { name: "Ambulance SAMU 119", badge: "Urgence médicale vitale", color: "#EF4444", icon: "Siren" },
    firefighters: { name: "Sapeurs-Pompiers (CCF 118)", badge: "Intervention Incendie & Secours", color: "#EA580C", icon: "Flame" },
    police: { name: "Police Secours 117", badge: "Intervention d'Urgence", color: "#2563EB", icon: "Shield" },
    convoy: { name: "Convoi Sécurisé", badge: "Priorité absolue", color: "#7C3AED", icon: "Sparkles" },
  };

  const vInfo = vehicleDetails[vehicleType] || vehicleDetails.ambulance;

  // Si c'est un corridor custom (calculé sur-mesure)
  if (customData) {
    return {
      id: `mission_${Date.now()}`,
      status: "in_progress",
      vehicleType: vehicleType || "ambulance",
      vehicleName: vInfo.name,
      badge: vInfo.badge,
      color: vInfo.color,
      city: cityKey,
      corridorId: customData.id || `custom_${Date.now()}`,
      corridorName: customData.name || `Corridor Sur-Mesure ➔ ${destination}`,
      origin: origin || customData.origin,
      destination: destination || customData.destination,
      distanceKm: customData.distanceKm,
      nominalDurationMinutes: customData.nominalDurationMinutes,
      priorityDurationMinutes: customData.priorityDurationMinutes,
      timeSavedMinutes: customData.timeSavedMinutes,
      startedAt: new Date().toISOString(),
      speedKmh: 75,
      currentStepIndex: 0,
      coordinates: customData.coordinates,
      intersections: (customData.intersections || []).map((int, idx) => ({
        ...int,
        state: idx === 0 ? "green_wave" : "pending",
      })),
      broadcastAlert: {
        active: true,
        title: `🚨 VÉHICULE D'URGENCE EN APPROCHE (${vInfo.name.toUpperCase()})`,
        message: `Corridor prioritaire activé de ${origin || customData.origin} vers ${destination || customData.destination}. Automobilistes : serrez à droite et libérez l'axe central.`,
        advisedAction: "Serrer immédiatement à droite et maintenir les intersections dégagées",
        zoneRadiusKm: 3.0,
      },
    };
  }

  // Sinon chercher dans les corridors préconfigurés
  const corridors = EMERGENCY_CORRIDORS_DB[cityKey] || EMERGENCY_CORRIDORS_DB["Yaoundé"];
  let corridor = corridors.find((c) => c.id === corridorId) || corridors[0];

  return {
    id: `mission_${Date.now()}`,
    status: "in_progress",
    vehicleType: vehicleType || "ambulance",
    vehicleName: vInfo.name,
    badge: vInfo.badge,
    color: vInfo.color,
    city: cityKey,
    corridorId: corridor.id,
    corridorName: corridor.name,
    origin: origin || corridor.origin,
    destination: destination || corridor.destination,
    distanceKm: corridor.distanceKm,
    nominalDurationMinutes: corridor.nominalDurationMinutes,
    priorityDurationMinutes: corridor.priorityDurationMinutes,
    timeSavedMinutes: corridor.timeSavedMinutes,
    startedAt: new Date().toISOString(),
    speedKmh: 74,
    currentStepIndex: 0,
    coordinates: corridor.coordinates,
    intersections: corridor.intersections.map((int, idx) => ({
      ...int,
      state: idx === 0 ? "green_wave" : "pending",
    })),
    broadcastAlert: {
      active: true,
      title: `🚨 VÉHICULE D'URGENCE EN APPROCHE (${vInfo.name.toUpperCase()})`,
      message: `Corridor prioritaire activé entre ${origin || corridor.origin} et ${destination || corridor.destination}. Automobilistes : serrez à droite et libérez l'axe central.`,
      advisedAction: "Serrer à droite et maintenir les intersections dégagées",
      zoneRadiusKm: 2.5,
    },
  };
}

// =========================================================================
// ROUTES & CONTRÔLEURS EXPORTÉS
// =========================================================================

// 1. Déclencher une mission de secours (Préconfigurée ou Sur-Mesure)
export const dispatchEmergencyMission = async (req, res) => {
  try {
    const { vehicleType = "ambulance", city = "Yaoundé", corridorId, origin, destination, customData } = req.body;

    activeEmergencyMission = buildMission({
      vehicleType,
      city,
      corridorId,
      origin,
      destination,
      customData,
    });

    const missions = await dbService.getEmergencyMissions();
    missions.unshift(activeEmergencyMission);
    await dbService.saveEmergencyMissions(missions);

    // Broadcast WebSocket en direct
    broadcastEmergencyUpdate(activeEmergencyMission);

    res.status(201).json({
      success: true,
      message: `Mission d'urgence ${activeEmergencyMission.vehicleName} enclenchée avec Onde Verte prioritaire !`,
      mission: activeEmergencyMission,
    });
  } catch (err) {
    console.error("[dispatchEmergencyMission Error]", err);
    res.status(500).json({ error: "Erreur enclenchement mission d'urgence" });
  }
};

// 2. Obtenir la mission en cours ou la liste des corridors et hôpitaux
export const getActiveEmergencyMission = (req, res) => {
  const { city } = req.query;
  const cityKey = city && city.toLowerCase().includes("douala") ? "Douala" : "Yaoundé";

  if (!activeEmergencyMission) {
    return res.json({
      active: false,
      mission: null,
      corridorsAvailable: EMERGENCY_CORRIDORS_DB[cityKey] || EMERGENCY_CORRIDORS_DB["Yaoundé"],
      hospitals: EMERGENCY_HOSPITALS_DB[cityKey] || EMERGENCY_HOSPITALS_DB["Yaoundé"],
    });
  }

  const elapsedSeconds = Math.floor((Date.now() - new Date(activeEmergencyMission.startedAt).getTime()) / 1000);

  res.json({
    active: true,
    elapsedSeconds,
    mission: activeEmergencyMission,
  });
};

// 3. Faire avancer la progression de la mission (Step Onde Verte)
export const stepEmergencyMission = async (req, res) => {
  try {
    if (!activeEmergencyMission) {
      return res.status(404).json({ error: "Aucune mission d'urgence active" });
    }

    const nextIndex = activeEmergencyMission.currentStepIndex + 1;
    const totalIntersections = activeEmergencyMission.intersections.length;

    if (nextIndex >= totalIntersections) {
      activeEmergencyMission.intersections.forEach((i) => (i.state = "cleared"));
      activeEmergencyMission.status = "completed";
      activeEmergencyMission.currentStepIndex = totalIntersections - 1;
      activeEmergencyMission.broadcastAlert.active = false;
      activeEmergencyMission.completedAt = new Date().toISOString();

      const completedMission = { ...activeEmergencyMission };
      activeEmergencyMission = null;

      const missions = await dbService.getEmergencyMissions();
      const idx = missions.findIndex((m) => m.id === completedMission.id);
      if (idx !== -1) {
        missions[idx] = completedMission;
      } else {
        missions.unshift(completedMission);
      }
      await dbService.saveEmergencyMissions(missions);

      broadcastEmergencyCancel();

      return res.json({
        success: true,
        message: "🎉 Véhicule de secours arrivé à destination ! Feux remis en cycle régulier.",
        missionCompleted: true,
        mission: completedMission,
      });
    }

    activeEmergencyMission.currentStepIndex = nextIndex;
    activeEmergencyMission.intersections = activeEmergencyMission.intersections.map((int, idx) => {
      if (idx < nextIndex) {
        return { ...int, state: "cleared" };
      } else if (idx === nextIndex) {
        return { ...int, state: "green_wave" };
      } else {
        return { ...int, state: "pending" };
      }
    });

    broadcastEmergencyUpdate(activeEmergencyMission);

    res.json({
      success: true,
      message: `Onde verte synchronisée sur : ${activeEmergencyMission.intersections[nextIndex].name}`,
      mission: activeEmergencyMission,
    });
  } catch (err) {
    console.error("[stepEmergencyMission Error]", err);
    res.status(500).json({ error: "Erreur avancement mission" });
  }
};

// 4. Clôturer / Annuler la mission d'urgence
export const cancelEmergencyMission = (req, res) => {
  if (!activeEmergencyMission) {
    return res.json({ success: true, message: "Aucune mission d'urgence active" });
  }

  activeEmergencyMission = null;
  broadcastEmergencyCancel();

  res.json({
    success: true,
    message: "Mission d'urgence annulée. Tous les carrefours ont été réinitialisés au cycle nominal.",
  });
};

// 5. Obtenir les alertes broadcast pour les conducteurs
export const getEmergencyBroadcast = (req, res) => {
  if (activeEmergencyMission && activeEmergencyMission.broadcastAlert?.active) {
    return res.json({
      hasActiveEmergency: true,
      broadcast: activeEmergencyMission.broadcastAlert,
      vehicle: {
        name: activeEmergencyMission.vehicleName,
        badge: activeEmergencyMission.badge,
        color: activeEmergencyMission.color,
      },
      currentIntersection:
        activeEmergencyMission.intersections[activeEmergencyMission.currentStepIndex]?.name,
    });
  }

  res.json({
    hasActiveEmergency: false,
    broadcast: null,
  });
};

// 6. NOUVEAU : Obtenir la télémétrie des hôpitaux et pôles de réanimation
export const getEmergencyHospitals = (req, res) => {
  try {
    const { city } = req.query;
    const cityKey = city && city.toLowerCase().includes("douala") ? "Douala" : "Yaoundé";
    const list = EMERGENCY_HOSPITALS_DB[cityKey] || EMERGENCY_HOSPITALS_DB["Yaoundé"];

    res.json({
      city: cityKey,
      count: list.length,
      hospitals: list,
    });
  } catch (err) {
    console.error("[getEmergencyHospitals Error]", err);
    res.status(500).json({ error: "Erreur chargement hôpitaux d'urgence" });
  }
};

// 7. NOUVEAU : Calculer un corridor d'urgence sur-mesure (OSRM ou repères réels)
export const calculateCustomEmergencyCorridor = async (req, res) => {
  try {
    const { origin, destination, originCoords, destCoords, city = "Yaoundé", vehicleType = "ambulance" } = req.body;

    const cityKey = city && city.toLowerCase().includes("douala") ? "Douala" : "Yaoundé";

    const startPos = originCoords || await resolveCoordinates(origin, cityKey);
    const endPos = destCoords || await resolveCoordinates(destination, cityKey);

    const originLabel = typeof origin === "string" ? origin : "Position de Départ";
    const destLabel = typeof destination === "string" ? destination : "Centre Hospitalier";

    // 1. Tenter le calcul d'itinéraire réel via OSRM
    let osrmRoutes = null;
    try {
      osrmRoutes = await fetchOsrmRoutes(startPos, endPos, originLabel, destLabel);
    } catch (osrmErr) {
      console.warn("[calculateCustomEmergencyCorridor] OSRM fallback:", osrmErr.message);
    }

    let coordinates = [];
    let distanceKm = 0;
    let nominalDurationMinutes = 0;

    if (osrmRoutes && osrmRoutes.length > 0) {
      const best = osrmRoutes[0];
      coordinates = best.coordinates;
      distanceKm = best.distanceKm;
      nominalDurationMinutes = best.durationMinutes;
    } else {
      // Fallback : Générer un tracé réaliste multi-points
      const directDist = calculateDistKm(startPos, endPos);
      distanceKm = parseFloat((directDist * 1.3).toFixed(1));
      nominalDurationMinutes = Math.max(5, Math.round(distanceKm * 4.2));

      // Génération de 12 points intermédiaires
      coordinates = [startPos];
      const steps = 12;
      for (let i = 1; i < steps; i++) {
        const ratio = i / steps;
        const lat = startPos[0] + (endPos[0] - startPos[0]) * ratio + (Math.sin(ratio * Math.PI) * 0.003);
        const lng = startPos[1] + (endPos[1] - startPos[1]) * ratio + (Math.cos(ratio * Math.PI) * 0.002);
        coordinates.push([lat, lng]);
      }
      coordinates.push(endPos);
    }

    // Calcul de l'Onde Verte : Réduction de 60% du temps de trajet
    const priorityDurationMinutes = Math.max(3, Math.round(nominalDurationMinutes * 0.38));
    const timeSavedMinutes = nominalDurationMinutes - priorityDurationMinutes;

    // 2. Extraire ou générer les carrefours clés à asservir le long du tracé
    const landmarks = CITY_LANDMARKS[cityKey] || CITY_LANDMARKS["Yaoundé"];
    const detectedIntersections = [];

    // Trouver les repères proches du tracé (< 500m)
    for (const [name, lm] of Object.entries(landmarks)) {
      if (lm.category === "landmark" || lm.category === "hospital") {
        for (const coord of coordinates) {
          if (calculateDistKm(coord, lm.pos) < 0.45) {
            if (!detectedIntersections.some((it) => it.name === name)) {
              detectedIntersections.push({
                id: `int_dyn_${detectedIntersections.length + 1}`,
                name: name,
                position: lm.pos,
                state: detectedIntersections.length === 0 ? "green_wave" : "pending",
                crossTrafficLight: "red",
              });
            }
            break;
          }
        }
      }
      if (detectedIntersections.length >= 6) break;
    }

    // Si moins de 3 carrefours détectés, échantillonner le tracé
    if (detectedIntersections.length < 3) {
      detectedIntersections.length = 0; // réinitialiser
      const count = Math.min(5, Math.max(3, Math.floor(coordinates.length / 3)));
      const stepInterval = Math.floor(coordinates.length / count);

      for (let i = 0; i < count; i++) {
        const ptIdx = Math.min(coordinates.length - 1, i * stepInterval);
        const pt = coordinates[ptIdx];
        const label = i === 0 ? `Départ : ${originLabel}` : i === count - 1 ? `Arrivée : ${destLabel}` : `Axe Régulé n°${i + 1} (${cityKey})`;
        detectedIntersections.push({
          id: `int_sample_${i + 1}`,
          name: label,
          position: pt,
          state: i === 0 ? "green_wave" : "pending",
          crossTrafficLight: "red",
        });
      }
    }

    const customCorridor = {
      id: `custom_corridor_${Date.now()}`,
      name: `Corridor Express ➔ ${destLabel}`,
      origin: originLabel,
      destination: destLabel,
      distanceKm,
      nominalDurationMinutes,
      priorityDurationMinutes,
      timeSavedMinutes,
      coordinates,
      intersections: detectedIntersections,
    };

    res.json({
      success: true,
      corridor: customCorridor,
    });
  } catch (err) {
    console.error("[calculateCustomEmergencyCorridor Error]", err);
    res.status(500).json({ error: "Erreur calcul corridor d'urgence sur-mesure" });
  }
};

// 8. NOUVEAU : Obtenir l'historique des missions d'urgence
export const getEmergencyMissionHistory = async (req, res) => {
  try {
    const missions = await dbService.getEmergencyMissions();
    const completed = missions.filter((m) => m.status === "completed" || !m.status);

    // Calculer les statistiques globales d'impact
    const totalMinutesSaved = completed.reduce((acc, m) => acc + (m.timeSavedMinutes || 15), 0);
    const totalKmCovered = completed.reduce((acc, m) => acc + (m.distanceKm || 5), 0);

    res.json({
      count: completed.length,
      stats: {
        totalMissions: completed.length,
        totalMinutesSaved,
        totalKmCovered: parseFloat(totalKmCovered.toFixed(1)),
        avgTimeSavedMinutes: completed.length ? Math.round(totalMinutesSaved / completed.length) : 16,
      },
      missions: completed.slice(0, 30),
    });
  } catch (err) {
    console.error("[getEmergencyMissionHistory Error]", err);
    res.status(500).json({ error: "Erreur récupération historique urgences" });
  }
};

// 9. NOUVEAU : Intervenir directement sur un signalement citoyen (Accident / Obstacle)
export const interveneOnReport = async (req, res) => {
  try {
    const { reportId, vehicleType = "ambulance", city = "Yaoundé" } = req.body;
    const reports = await dbService.getCitizenReports();
    const report = reports.find((r) => r.id === reportId);

    if (!report) {
      return res.status(404).json({ error: "Signalement introuvable" });
    }

    const cityKey = report.city || city || "Yaoundé";
    const hospitals = EMERGENCY_HOSPITALS_DB[cityKey] || EMERGENCY_HOSPITALS_DB["Yaoundé"];
    const nearestHospital = hospitals[0];

    const originPos = report.position || [3.8667, 11.5167];
    const destPos = nearestHospital.position;

    // Calculer le corridor d'intervention
    const customCorridor = {
      id: `report_corridor_${report.id}`,
      name: `Urgence : ${report.title} ➔ ${nearestHospital.name}`,
      origin: report.locationName || "Lieu de l'accident",
      destination: nearestHospital.name,
      distanceKm: 5.2,
      nominalDurationMinutes: 22,
      priorityDurationMinutes: 7,
      timeSavedMinutes: 15,
      coordinates: [originPos, destPos],
      intersections: [
        { id: "int_rep_1", name: `Lieu de l'incident : ${report.locationName || report.title}`, position: originPos, state: "green_wave", crossTrafficLight: "red" },
        { id: "int_rep_2", name: `Entrée Urgences : ${nearestHospital.name}`, position: destPos, state: "pending", crossTrafficLight: "red" },
      ],
    };

    activeEmergencyMission = buildMission({
      vehicleType,
      city: cityKey,
      corridorId: customCorridor.id,
      origin: customCorridor.origin,
      destination: customCorridor.destination,
      customData: customCorridor,
    });

    const missions = await dbService.getEmergencyMissions();
    missions.unshift(activeEmergencyMission);
    await dbService.saveEmergencyMissions(missions);

    broadcastEmergencyUpdate(activeEmergencyMission);

    res.status(201).json({
      success: true,
      message: `🚨 Secours en route vers le signalement "${report.title}" ! Onde verte activée.`,
      mission: activeEmergencyMission,
    });
  } catch (err) {
    console.error("[interveneOnReport Error]", err);
    res.status(500).json({ error: "Erreur intervention sur signalement" });
  }
};
