window.ART_DATA.fields = [
  {
    id: "photography",
    index: "00",
    name: "摄影／暗房",
    en: "PHOTOGRAPHY",
    short: "既有视觉证据主轴",
    description: "保留原有摄影研究样本，作为其余媒介的比较基线；这里关注镜头、印相、档案与流通，而不是把所有艺术还原成图像。",
  },
  {
    id: "painting-print",
    index: "01",
    name: "绘画／版画",
    en: "PAINTING + PRINT",
    short: "颜料、版基与观看路径",
    description: "从画布、绢、纸和版面出发，比较原作、印次、题跋、复制与观看者位置。",
  },
  {
    id: "sculpture-installation",
    index: "02",
    name: "雕塑／装置",
    en: "SCULPTURE + INSTALLATION",
    short: "体积、现场与版本",
    description: "作品不是一张可缩放的照片；重量、结构、展陈、维护和复制版本共同决定它是什么。",
  },
  {
    id: "architecture-space",
    index: "03",
    name: "建筑／空间",
    en: "ARCHITECTURE",
    short: "尺度、制度与身体路径",
    description: "把图纸、施工、使用、法规和空间经验纳入作品判断，拒绝只看建筑外观明信片。",
  },
  {
    id: "performance-body",
    index: "04",
    name: "表演／身体",
    en: "PERFORMANCE",
    short: "现场、记录与复演",
    description: "现场消失之后，身体如何通过指令、照片、录像、口述和复演继续存在。",
  },
  {
    id: "film-video",
    index: "05",
    name: "电影／录像",
    en: "FILM + VIDEO",
    short: "时间、剪辑与放映",
    description: "从画格、蒙太奇、声音、母带和放映规格理解运动影像，不以单帧截图替代影片。",
  },
  {
    id: "textile-craft",
    index: "06",
    name: "纺织／工艺",
    en: "TEXTILE + CRAFT",
    short: "纤维、纹样与劳动",
    description: "将编织、印染、刺绣、服装与仪式用途放入材料史和全球贸易史。",
  },
  {
    id: "land-ecology",
    index: "07",
    name: "地景／生态",
    en: "LAND + ECOLOGY",
    short: "土地、时间与非人行动者",
    description: "作品跨越展览周期，涉及天气、物种、所有权、维护与不可逆的环境变化。",
  },
  {
    id: "digital-algorithmic",
    index: "08",
    name: "数字／算法",
    en: "DIGITAL + ALGORITHM",
    short: "界面、代码与基础设施",
    description: "屏幕之后还有硬件、数据、模型、能源与平台治理；算法作品必须同时研究其运行条件。",
  },
];

for (const work of window.ART_DATA.works) {
  work.field = work.field || "photography";
}

window.ART_DATA.periods = [
  {
    id: "before",
    years: "史前—1400",
    label: "仪式、身体与神圣空间",
    question: "图像如何在制度、信仰与空间中被赋予效力？",
    note: "洞窟、祭坛、手抄本、雕塑和纪念性建筑共同组织时间、权力与身体。材料与仪式而非单一作者构成主要证据。",
  },
  {
    id: "mechanical",
    years: "1400—1789",
    label: "透视、印刷与帝国",
    question: "复制技术如何扩大中心，同时制造被观看的边缘？",
    note: "透视、版画、地图、收藏室和殖民贸易把图像变成可传播、可积累、可占有的知识装置。",
  },
  {
    id: "modern",
    years: "1790—1945",
    label: "现代主体与前卫",
    question: "当媒介成为形式，谁获得表达自我与改造世界的权利？",
    note: "摄影、绘画、建筑、电影、舞蹈与印刷共同进入工业城市和大众政治。现代主义不是单一风格，而是关于媒介、主体和进步的多重争论。",
  },
  {
    id: "archive",
    years: "1946—1969",
    label: "战后档案与日常",
    question: "创伤、消费和冷战如何进入看似普通的材料？",
    note: "抽象表现主义、观念艺术、行为、纪实、设计和新媒体并行出现。档案既是制度，也是艺术家重新编排记忆的方法。",
  },
  {
    id: "image-turn",
    years: "1970—1989",
    label: "身份、机构与图像转向",
    question: "作者、原创和观看位置为何成为作品内容？",
    note: "挪用、女性主义、后殖民、机构批判和地景艺术把艺术从物件扩展到制度、身体、土地与图像流通。",
  },
  {
    id: "global",
    years: "1990—2009",
    label: "全球化与档案热",
    question: "不同历史如何进入同一个双年展和艺术市场？",
    note: "装置、参与式实践、数字媒体和全球展览网络扩大可见性，也重新分配了劳动、翻译与制度权力。",
  },
  {
    id: "computational",
    years: "2010—现在",
    label: "生态与计算",
    question: "当图像、空间和生命都由基础设施持续运行时，作品在哪里结束？",
    note: "平台、算法、气候危机、生物技术和分布式维护把艺术对象扩展为过程、界面和数据链。",
  },
];

const experimentWorkRefs = {
  lab01: ["w01", "w41", "w46"],
  lab02: ["w09", "w42", "w57"],
  lab03: ["w19", "w43", "w63"],
  lab04: ["w28", "w44", "w59"],
  lab05: ["w33", "w70", "w80"],
};

for (const lab of window.ART_DATA.experiments) {
  lab.works = experimentWorkRefs[lab.id] || lab.works.filter((id) => workMapHas(id));
}

function workMapHas(workId) {
  return window.ART_DATA.works.some((work) => work.id === workId);
}
