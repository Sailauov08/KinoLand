/**
 * Offline DEMO catalogue — used only when TMDB is not configured or unreachable.
 *
 * - Ids are the films' real TMDB ids, so watchlists created in demo mode stay valid with live data.
 * - Factual metadata only (title, year, runtime, genres, original language, director, principal cast).
 * - Ratings are intentionally absent (null): KINO never invents scores.
 * - Synopses are short original one-line premises written for this demo, not copied from TMDB.
 * - No posters/backdrops: the UI renders clearly-labelled generated artwork instead.
 */
export interface DemoMovie {
  id: number;
  title: { en: string; ru: string };
  originalTitle: string;
  year: number;
  runtime: number;
  genres: number[];
  lang: string;
  directors: string[];
  cast: string[];
  overview: { en: string; ru: string };
}

export const DEMO_MOVIES: DemoMovie[] = [
  {
    id: 278, title: { en: "The Shawshank Redemption", ru: "Побег из Шоушенка" }, originalTitle: "The Shawshank Redemption",
    year: 1994, runtime: 142, genres: [18, 80], lang: "en", directors: ["Frank Darabont"],
    cast: ["Tim Robbins", "Morgan Freeman", "Bob Gunton", "William Sadler"],
    overview: {
      en: "A banker sentenced to life in a Maine prison forms an unlikely friendship and quietly holds on to hope over two decades.",
      ru: "Банкир, приговорённый к пожизненному заключению, находит друга за решёткой и два десятилетия не теряет надежды.",
    },
  },
  {
    id: 238, title: { en: "The Godfather", ru: "Крёстный отец" }, originalTitle: "The Godfather",
    year: 1972, runtime: 175, genres: [18, 80], lang: "en", directors: ["Francis Ford Coppola"],
    cast: ["Marlon Brando", "Al Pacino", "James Caan", "Robert Duvall", "Diane Keaton"],
    overview: {
      en: "The ageing head of a New York crime family sees his reluctant youngest son drawn into the family business.",
      ru: "Стареющий глава нью-йоркского мафиозного клана видит, как его младший сын против воли втягивается в семейное дело.",
    },
  },
  {
    id: 240, title: { en: "The Godfather Part II", ru: "Крёстный отец 2" }, originalTitle: "The Godfather Part II",
    year: 1974, runtime: 202, genres: [18, 80], lang: "en", directors: ["Francis Ford Coppola"],
    cast: ["Al Pacino", "Robert De Niro", "Robert Duvall", "Diane Keaton"],
    overview: {
      en: "Two timelines follow a young immigrant's rise in New York and his son's tightening grip on the family empire.",
      ru: "Две сюжетные линии: путь молодого иммигранта в Нью-Йорке и укрепление власти его сына над семейной империей.",
    },
  },
  {
    id: 424, title: { en: "Schindler's List", ru: "Список Шиндлера" }, originalTitle: "Schindler's List",
    year: 1993, runtime: 195, genres: [18, 36, 10752], lang: "en", directors: ["Steven Spielberg"],
    cast: ["Liam Neeson", "Ben Kingsley", "Ralph Fiennes", "Caroline Goodall"],
    overview: {
      en: "A German industrialist in occupied Poland risks everything to protect his Jewish workers during the Holocaust.",
      ru: "Немецкий промышленник в оккупированной Польше рискует всем, чтобы спасти своих рабочих-евреев во время Холокоста.",
    },
  },
  {
    id: 389, title: { en: "12 Angry Men", ru: "12 разгневанных мужчин" }, originalTitle: "12 Angry Men",
    year: 1957, runtime: 96, genres: [18], lang: "en", directors: ["Sidney Lumet"],
    cast: ["Henry Fonda", "Lee J. Cobb", "Martin Balsam", "E.G. Marshall"],
    overview: {
      en: "One juror's doubt forces eleven others to reconsider what looks like an open-and-shut murder case.",
      ru: "Сомнение одного присяжного заставляет одиннадцать других пересмотреть, казалось бы, очевидное дело об убийстве.",
    },
  },
  {
    id: 129, title: { en: "Spirited Away", ru: "Унесённые призраками" }, originalTitle: "千と千尋の神隠し",
    year: 2001, runtime: 125, genres: [16, 10751, 14], lang: "ja", directors: ["Hayao Miyazaki"],
    cast: ["Rumi Hiiragi", "Miyu Irino", "Mari Natsuki"],
    overview: {
      en: "A ten-year-old girl must work in a bathhouse for spirits to free her parents and find her way home.",
      ru: "Десятилетняя девочка устраивается работать в купальню для духов, чтобы спасти родителей и вернуться домой.",
    },
  },
  {
    id: 155, title: { en: "The Dark Knight", ru: "Тёмный рыцарь" }, originalTitle: "The Dark Knight",
    year: 2008, runtime: 152, genres: [18, 28, 80, 53], lang: "en", directors: ["Christopher Nolan"],
    cast: ["Christian Bale", "Heath Ledger", "Aaron Eckhart", "Michael Caine", "Gary Oldman"],
    overview: {
      en: "Batman faces a criminal mastermind who wants to prove that anyone in Gotham can be pushed into chaos.",
      ru: "Бэтмен противостоит преступному гению, который хочет доказать, что любого жителя Готэма можно толкнуть к хаосу.",
    },
  },
  {
    id: 680, title: { en: "Pulp Fiction", ru: "Криминальное чтиво" }, originalTitle: "Pulp Fiction",
    year: 1994, runtime: 154, genres: [53, 80], lang: "en", directors: ["Quentin Tarantino"],
    cast: ["John Travolta", "Samuel L. Jackson", "Uma Thurman", "Bruce Willis"],
    overview: {
      en: "Interlocking stories of hitmen, a boxer and a gangster's wife unfold out of order across Los Angeles.",
      ru: "Переплетённые истории наёмных убийц, боксёра и жены гангстера разворачиваются в Лос-Анджелесе вне хронологии.",
    },
  },
  {
    id: 13, title: { en: "Forrest Gump", ru: "Форрест Гамп" }, originalTitle: "Forrest Gump",
    year: 1994, runtime: 142, genres: [35, 18, 10749], lang: "en", directors: ["Robert Zemeckis"],
    cast: ["Tom Hanks", "Robin Wright", "Gary Sinise", "Sally Field"],
    overview: {
      en: "A kind-hearted man from Alabama drifts through decades of American history while never forgetting his first love.",
      ru: "Добродушный парень из Алабамы проходит сквозь десятилетия американской истории, не забывая свою первую любовь.",
    },
  },
  {
    id: 550, title: { en: "Fight Club", ru: "Бойцовский клуб" }, originalTitle: "Fight Club",
    year: 1999, runtime: 139, genres: [18], lang: "en", directors: ["David Fincher"],
    cast: ["Edward Norton", "Brad Pitt", "Helena Bonham Carter"],
    overview: {
      en: "An insomniac office worker and a charismatic soap salesman start an underground club that spirals out of control.",
      ru: "Офисный работник, страдающий бессонницей, и харизматичный продавец мыла основывают подпольный клуб, выходящий из-под контроля.",
    },
  },
  {
    id: 27205, title: { en: "Inception", ru: "Начало" }, originalTitle: "Inception",
    year: 2010, runtime: 148, genres: [28, 878, 12], lang: "en", directors: ["Christopher Nolan"],
    cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page", "Tom Hardy", "Marion Cotillard"],
    overview: {
      en: "A thief who steals secrets from dreams is offered a way home if he can plant an idea instead.",
      ru: "Вору, похищающему секреты из снов, обещают возвращение домой, если он сумеет не украсть, а внедрить идею.",
    },
  },
  {
    id: 157336, title: { en: "Interstellar", ru: "Интерстеллар" }, originalTitle: "Interstellar",
    year: 2014, runtime: 169, genres: [12, 18, 878], lang: "en", directors: ["Christopher Nolan"],
    cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain", "Michael Caine"],
    overview: {
      en: "With Earth failing, a former pilot leads a mission through a wormhole in search of a new home for humanity.",
      ru: "Земля умирает, и бывший пилот ведёт экспедицию через червоточину в поисках нового дома для человечества.",
    },
  },
  {
    id: 603, title: { en: "The Matrix", ru: "Матрица" }, originalTitle: "The Matrix",
    year: 1999, runtime: 136, genres: [28, 878], lang: "en", directors: ["Lana Wachowski", "Lilly Wachowski"],
    cast: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss", "Hugo Weaving"],
    overview: {
      en: "A hacker learns that the world he knows is a simulation and joins a rebellion against its machine overseers.",
      ru: "Хакер узнаёт, что привычный мир — симуляция, и присоединяется к восстанию против управляющих им машин.",
    },
  },
  {
    id: 120, title: { en: "The Lord of the Rings: The Fellowship of the Ring", ru: "Властелин колец: Братство Кольца" },
    originalTitle: "The Lord of the Rings: The Fellowship of the Ring",
    year: 2001, runtime: 179, genres: [12, 14, 28], lang: "en", directors: ["Peter Jackson"],
    cast: ["Elijah Wood", "Ian McKellen", "Viggo Mortensen", "Sean Astin"],
    overview: {
      en: "A young hobbit sets out with eight companions to destroy a ring of terrible power.",
      ru: "Юный хоббит вместе с восемью спутниками отправляется в путь, чтобы уничтожить Кольцо Всевластья.",
    },
  },
  {
    id: 122, title: { en: "The Lord of the Rings: The Return of the King", ru: "Властелин колец: Возвращение короля" },
    originalTitle: "The Lord of the Rings: The Return of the King",
    year: 2003, runtime: 201, genres: [12, 14, 28], lang: "en", directors: ["Peter Jackson"],
    cast: ["Elijah Wood", "Viggo Mortensen", "Ian McKellen", "Sean Astin"],
    overview: {
      en: "As armies gather for a final battle, two hobbits make their last climb toward Mount Doom.",
      ru: "Пока армии собираются на последнюю битву, двое хоббитов совершают финальный путь к Роковой горе.",
    },
  },
  {
    id: 496243, title: { en: "Parasite", ru: "Паразиты" }, originalTitle: "기생충",
    year: 2019, runtime: 132, genres: [35, 53, 18], lang: "ko", directors: ["Bong Joon Ho"],
    cast: ["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong", "Choi Woo-shik"],
    overview: {
      en: "A struggling family schemes its way into the household of a wealthy one, until a hidden secret surfaces.",
      ru: "Бедная семья хитростью проникает в дом богачей — пока не всплывает спрятанная там тайна.",
    },
  },
  {
    id: 769, title: { en: "GoodFellas", ru: "Славные парни" }, originalTitle: "GoodFellas",
    year: 1990, runtime: 145, genres: [18, 80], lang: "en", directors: ["Martin Scorsese"],
    cast: ["Robert De Niro", "Ray Liotta", "Joe Pesci", "Lorraine Bracco"],
    overview: {
      en: "Three decades in the life of a mob associate, from teenage errand boy to government witness.",
      ru: "Три десятилетия из жизни гангстера — от подростка на побегушках до свидетеля обвинения.",
    },
  },
  {
    id: 274, title: { en: "The Silence of the Lambs", ru: "Молчание ягнят" }, originalTitle: "The Silence of the Lambs",
    year: 1991, runtime: 118, genres: [80, 18, 53], lang: "en", directors: ["Jonathan Demme"],
    cast: ["Jodie Foster", "Anthony Hopkins", "Scott Glenn"],
    overview: {
      en: "An FBI trainee seeks the help of an imprisoned psychiatrist to catch a serial killer.",
      ru: "Стажёр ФБР обращается за помощью к заключённому психиатру, чтобы поймать серийного убийцу.",
    },
  },
  {
    id: 807, title: { en: "Se7en", ru: "Семь" }, originalTitle: "Se7en",
    year: 1995, runtime: 127, genres: [80, 9648, 53], lang: "en", directors: ["David Fincher"],
    cast: ["Brad Pitt", "Morgan Freeman", "Gwyneth Paltrow"],
    overview: {
      en: "Two detectives hunt a killer whose crimes are modelled on the seven deadly sins.",
      ru: "Двое детективов охотятся на убийцу, чьи преступления повторяют семь смертных грехов.",
    },
  },
  {
    id: 346, title: { en: "Seven Samurai", ru: "Семь самураев" }, originalTitle: "七人の侍",
    year: 1954, runtime: 207, genres: [28, 18], lang: "ja", directors: ["Akira Kurosawa"],
    cast: ["Toshiro Mifune", "Takashi Shimura", "Keiko Tsushima"],
    overview: {
      en: "Villagers threatened by bandits recruit seven masterless samurai to defend their harvest.",
      ru: "Крестьяне, которым угрожают разбойники, нанимают семерых самураев для защиты урожая.",
    },
  },
  {
    id: 497, title: { en: "The Green Mile", ru: "Зелёная миля" }, originalTitle: "The Green Mile",
    year: 1999, runtime: 189, genres: [14, 18, 80], lang: "en", directors: ["Frank Darabont"],
    cast: ["Tom Hanks", "Michael Clarke Duncan", "David Morse"],
    overview: {
      en: "A death-row guard begins to believe that one of his prisoners has a gift no one can explain.",
      ru: "Надзиратель блока смертников начинает верить, что один из заключённых обладает необъяснимым даром.",
    },
  },
  {
    id: 637, title: { en: "Life Is Beautiful", ru: "Жизнь прекрасна" }, originalTitle: "La vita è bella",
    year: 1997, runtime: 116, genres: [35, 18], lang: "it", directors: ["Roberto Benigni"],
    cast: ["Roberto Benigni", "Nicoletta Braschi", "Giorgio Cantarini"],
    overview: {
      en: "A Jewish father uses imagination and humour to shield his young son from the reality of a concentration camp.",
      ru: "Отец-еврей с помощью фантазии и юмора оберегает маленького сына от ужасов концлагеря.",
    },
  },
  {
    id: 598, title: { en: "City of God", ru: "Город Бога" }, originalTitle: "Cidade de Deus",
    year: 2002, runtime: 130, genres: [18, 80], lang: "pt", directors: ["Fernando Meirelles", "Kátia Lund"],
    cast: ["Alexandre Rodrigues", "Leandro Firmino", "Phellipe Haagensen"],
    overview: {
      en: "A young photographer grows up amid escalating gang violence in a Rio de Janeiro favela.",
      ru: "Юный фотограф взрослеет среди нарастающих бандитских войн в фавеле Рио-де-Жанейро.",
    },
  },
  {
    id: 194, title: { en: "Amélie", ru: "Амели" }, originalTitle: "Le Fabuleux Destin d'Amélie Poulain",
    year: 2001, runtime: 122, genres: [35, 10749], lang: "fr", directors: ["Jean-Pierre Jeunet"],
    cast: ["Audrey Tautou", "Mathieu Kassovitz", "Rufus"],
    overview: {
      en: "A shy Parisian waitress secretly improves the lives of those around her while avoiding her own chance at love.",
      ru: "Застенчивая парижская официантка тайно меняет к лучшему жизни окружающих, избегая собственного счастья.",
    },
  },
  {
    id: 1398, title: { en: "Stalker", ru: "Сталкер" }, originalTitle: "Сталкер",
    year: 1979, runtime: 162, genres: [878, 18], lang: "ru", directors: ["Andrei Tarkovsky"],
    cast: ["Alexander Kaidanovsky", "Anatoly Solonitsyn", "Nikolai Grinko"],
    overview: {
      en: "A guide leads a writer and a scientist into the forbidden Zone toward a room said to grant wishes.",
      ru: "Проводник ведёт Писателя и Профессора в запретную Зону — к комнате, где якобы исполняются желания.",
    },
  },
  {
    id: 244786, title: { en: "Whiplash", ru: "Одержимость" }, originalTitle: "Whiplash",
    year: 2014, runtime: 107, genres: [18, 10402], lang: "en", directors: ["Damien Chazelle"],
    cast: ["Miles Teller", "J.K. Simmons", "Melissa Benoist"],
    overview: {
      en: "An ambitious young drummer is pushed to his limits by a ferocious conservatory instructor.",
      ru: "Амбициозный молодой барабанщик доходит до предела под руководством беспощадного преподавателя.",
    },
  },
  {
    id: 438631, title: { en: "Dune", ru: "Дюна" }, originalTitle: "Dune",
    year: 2021, runtime: 155, genres: [878, 12], lang: "en", directors: ["Denis Villeneuve"],
    cast: ["Timothée Chalamet", "Rebecca Ferguson", "Oscar Isaac", "Zendaya"],
    overview: {
      en: "The heir of a noble house is thrust into a deadly struggle for control of a desert planet.",
      ru: "Наследник знатного дома оказывается втянут в смертельную борьбу за власть над пустынной планетой.",
    },
  },
  {
    id: 872585, title: { en: "Oppenheimer", ru: "Оппенгеймер" }, originalTitle: "Oppenheimer",
    year: 2023, runtime: 181, genres: [18, 36], lang: "en", directors: ["Christopher Nolan"],
    cast: ["Cillian Murphy", "Emily Blunt", "Matt Damon", "Robert Downey Jr."],
    overview: {
      en: "The physicist who led the Manhattan Project grapples with the consequences of the bomb he helped build.",
      ru: "Физик, руководивший Манхэттенским проектом, сталкивается с последствиями созданной им бомбы.",
    },
  },
  {
    id: 76341, title: { en: "Mad Max: Fury Road", ru: "Безумный Макс: Дорога ярости" }, originalTitle: "Mad Max: Fury Road",
    year: 2015, runtime: 120, genres: [28, 12, 878], lang: "en", directors: ["George Miller"],
    cast: ["Tom Hardy", "Charlize Theron", "Nicholas Hoult"],
    overview: {
      en: "In a wasteland ruled by a tyrant, a drifter and a rebel commander flee across the desert with his captives.",
      ru: "В постапокалиптической пустыне скиталец и мятежная воительница бегут от тирана вместе с его пленницами.",
    },
  },
  {
    id: 313369, title: { en: "La La Land", ru: "Ла-Ла Ленд" }, originalTitle: "La La Land",
    year: 2016, runtime: 128, genres: [35, 18, 10749, 10402], lang: "en", directors: ["Damien Chazelle"],
    cast: ["Ryan Gosling", "Emma Stone", "John Legend"],
    overview: {
      en: "A jazz pianist and an aspiring actress fall in love while chasing their dreams in Los Angeles.",
      ru: "Джазовый пианист и начинающая актриса влюбляются друг в друга, пока гонятся за мечтой в Лос-Анджелесе.",
    },
  },
  {
    id: 120467, title: { en: "The Grand Budapest Hotel", ru: "Отель «Гранд Будапешт»" }, originalTitle: "The Grand Budapest Hotel",
    year: 2014, runtime: 100, genres: [35, 18], lang: "en", directors: ["Wes Anderson"],
    cast: ["Ralph Fiennes", "Tony Revolori", "F. Murray Abraham", "Saoirse Ronan"],
    overview: {
      en: "A legendary concierge and his lobby boy are swept into a caper over a priceless painting.",
      ru: "Легендарный консьерж и его юный помощник оказываются втянуты в историю с бесценной картиной.",
    },
  },
  {
    id: 372058, title: { en: "Your Name.", ru: "Твоё имя" }, originalTitle: "君の名は。",
    year: 2016, runtime: 106, genres: [16, 10749, 18], lang: "ja", directors: ["Makoto Shinkai"],
    cast: ["Ryunosuke Kamiki", "Mone Kamishiraishi"],
    overview: {
      en: "Two teenagers who have never met begin to mysteriously swap bodies across the distance of Japan.",
      ru: "Двое подростков, никогда не встречавшихся, начинают таинственным образом меняться телами.",
    },
  },
  {
    id: 354912, title: { en: "Coco", ru: "Тайна Коко" }, originalTitle: "Coco",
    year: 2017, runtime: 105, genres: [10751, 16, 10402], lang: "en", directors: ["Lee Unkrich"],
    cast: ["Anthony Gonzalez", "Gael García Bernal", "Benjamin Bratt"],
    overview: {
      en: "A boy who dreams of music crosses into the Land of the Dead to uncover his family's history.",
      ru: "Мальчик, мечтающий о музыке, попадает в Страну мёртвых, чтобы раскрыть тайну своей семьи.",
    },
  },
  {
    id: 10681, title: { en: "WALL·E", ru: "ВАЛЛ·И" }, originalTitle: "WALL·E",
    year: 2008, runtime: 98, genres: [16, 10751, 878], lang: "en", directors: ["Andrew Stanton"],
    cast: ["Ben Burtt", "Elissa Knight", "Jeff Garlin"],
    overview: {
      en: "A lonely trash-compacting robot left on Earth follows a visiting probe across the galaxy.",
      ru: "Одинокий робот-уборщик, оставшийся на Земле, отправляется за прилетевшим зондом через всю галактику.",
    },
  },
  {
    id: 105, title: { en: "Back to the Future", ru: "Назад в будущее" }, originalTitle: "Back to the Future",
    year: 1985, runtime: 116, genres: [12, 35, 878], lang: "en", directors: ["Robert Zemeckis"],
    cast: ["Michael J. Fox", "Christopher Lloyd", "Lea Thompson"],
    overview: {
      en: "A teenager accidentally travels thirty years into the past and must make sure his parents fall in love.",
      ru: "Подросток случайно попадает на тридцать лет в прошлое и должен сделать так, чтобы его родители влюбились.",
    },
  },
  {
    id: 78, title: { en: "Blade Runner", ru: "Бегущий по лезвию" }, originalTitle: "Blade Runner",
    year: 1982, runtime: 117, genres: [878, 18, 53], lang: "en", directors: ["Ridley Scott"],
    cast: ["Harrison Ford", "Rutger Hauer", "Sean Young"],
    overview: {
      en: "In a rain-soaked future Los Angeles, a weary detective hunts escaped synthetic humans.",
      ru: "В дождливом Лос-Анджелесе будущего уставший детектив выслеживает беглых андроидов.",
    },
  },
  {
    id: 348, title: { en: "Alien", ru: "Чужой" }, originalTitle: "Alien",
    year: 1979, runtime: 117, genres: [27, 878], lang: "en", directors: ["Ridley Scott"],
    cast: ["Sigourney Weaver", "Tom Skerritt", "John Hurt"],
    overview: {
      en: "The crew of a commercial spaceship answers a distress signal and brings back a deadly lifeform.",
      ru: "Экипаж грузового космического корабля откликается на сигнал бедствия и приводит на борт смертоносное существо.",
    },
  },
  {
    id: 98, title: { en: "Gladiator", ru: "Гладиатор" }, originalTitle: "Gladiator",
    year: 2000, runtime: 155, genres: [28, 18, 12], lang: "en", directors: ["Ridley Scott"],
    cast: ["Russell Crowe", "Joaquin Phoenix", "Connie Nielsen"],
    overview: {
      en: "A betrayed Roman general is sold into slavery and fights his way through the arena toward revenge.",
      ru: "Преданный римский полководец становится рабом и пробивается через арену к мести.",
    },
  },
  {
    id: 329, title: { en: "Jurassic Park", ru: "Парк Юрского периода" }, originalTitle: "Jurassic Park",
    year: 1993, runtime: 127, genres: [12, 878], lang: "en", directors: ["Steven Spielberg"],
    cast: ["Sam Neill", "Laura Dern", "Jeff Goldblum"],
    overview: {
      en: "Visitors to an island theme park of cloned dinosaurs are stranded when its systems fail.",
      ru: "Гости парка с клонированными динозаврами оказываются в ловушке, когда системы острова выходят из строя.",
    },
  },
  {
    id: 862, title: { en: "Toy Story", ru: "История игрушек" }, originalTitle: "Toy Story",
    year: 1995, runtime: 81, genres: [16, 12, 10751, 35], lang: "en", directors: ["John Lasseter"],
    cast: ["Tom Hanks", "Tim Allen", "Don Rickles"],
    overview: {
      en: "A cowboy doll feels threatened when a flashy space-ranger toy becomes his owner's new favourite.",
      ru: "Ковбой-игрушка ревнует хозяина к новому любимцу — эффектному космическому рейнджеру.",
    },
  },
  {
    id: 280, title: { en: "Terminator 2: Judgment Day", ru: "Терминатор 2: Судный день" }, originalTitle: "Terminator 2: Judgment Day",
    year: 1991, runtime: 137, genres: [28, 53, 878], lang: "en", directors: ["James Cameron"],
    cast: ["Arnold Schwarzenegger", "Linda Hamilton", "Edward Furlong"],
    overview: {
      en: "A reprogrammed cyborg is sent back in time to protect a boy from a more advanced machine.",
      ru: "Перепрограммированного киборга отправляют в прошлое защитить мальчика от более совершенной машины.",
    },
  },
  {
    id: 857, title: { en: "Saving Private Ryan", ru: "Спасти рядового Райана" }, originalTitle: "Saving Private Ryan",
    year: 1998, runtime: 169, genres: [18, 36, 10752], lang: "en", directors: ["Steven Spielberg"],
    cast: ["Tom Hanks", "Matt Damon", "Tom Sizemore"],
    overview: {
      en: "After D-Day, a squad of soldiers goes behind enemy lines to bring one paratrooper home.",
      ru: "После высадки в Нормандии отряд солдат отправляется в тыл врага, чтобы вернуть домой одного десантника.",
    },
  },
  {
    id: 539, title: { en: "Psycho", ru: "Психо" }, originalTitle: "Psycho",
    year: 1960, runtime: 109, genres: [27, 18, 53], lang: "en", directors: ["Alfred Hitchcock"],
    cast: ["Anthony Perkins", "Janet Leigh", "Vera Miles"],
    overview: {
      en: "A secretary on the run checks into a remote motel run by a quiet young man and his unseen mother.",
      ru: "Секретарша в бегах останавливается в уединённом мотеле, которым управляет тихий юноша и его невидимая мать.",
    },
  },
  {
    id: 1124, title: { en: "The Prestige", ru: "Престиж" }, originalTitle: "The Prestige",
    year: 2006, runtime: 130, genres: [18, 9648, 878], lang: "en", directors: ["Christopher Nolan"],
    cast: ["Hugh Jackman", "Christian Bale", "Michael Caine", "Scarlett Johansson"],
    overview: {
      en: "Two rival stage magicians in Victorian London escalate their feud in pursuit of the ultimate illusion.",
      ru: "Двое соперничающих иллюзионистов викторианского Лондона ведут всё более опасную борьбу за идеальный фокус.",
    },
  },
  {
    id: 475557, title: { en: "Joker", ru: "Джокер" }, originalTitle: "Joker",
    year: 2019, runtime: 122, genres: [80, 53, 18], lang: "en", directors: ["Todd Phillips"],
    cast: ["Joaquin Phoenix", "Robert De Niro", "Zazie Beetz"],
    overview: {
      en: "A failed comedian in early-1980s Gotham descends into violence as the city around him unravels.",
      ru: "Неудачливый комик в Готэме начала 1980-х скатывается к насилию, пока город вокруг погружается в хаос.",
    },
  },
  {
    id: 299534, title: { en: "Avengers: Endgame", ru: "Мстители: Финал" }, originalTitle: "Avengers: Endgame",
    year: 2019, runtime: 181, genres: [12, 878, 28], lang: "en", directors: ["Anthony Russo", "Joe Russo"],
    cast: ["Robert Downey Jr.", "Chris Evans", "Mark Ruffalo", "Scarlett Johansson"],
    overview: {
      en: "The surviving Avengers assemble one last time to undo the devastation left by Thanos.",
      ru: "Выжившие Мстители объединяются в последний раз, чтобы обратить вспять разрушения, оставленные Таносом.",
    },
  },
  {
    id: 14160, title: { en: "Up", ru: "Вверх" }, originalTitle: "Up",
    year: 2009, runtime: 96, genres: [16, 35, 10751, 12], lang: "en", directors: ["Pete Docter"],
    cast: ["Ed Asner", "Jordan Nagai", "Christopher Plummer"],
    overview: {
      en: "A widowed balloon seller ties thousands of balloons to his house and floats off toward South America.",
      ru: "Овдовевший продавец воздушных шаров привязывает их к дому и улетает в Южную Америку.",
    },
  },
  {
    id: 597, title: { en: "Titanic", ru: "Титаник" }, originalTitle: "Titanic",
    year: 1997, runtime: 194, genres: [18, 10749], lang: "en", directors: ["James Cameron"],
    cast: ["Leonardo DiCaprio", "Kate Winslet", "Billy Zane"],
    overview: {
      en: "A young aristocrat and a penniless artist fall in love aboard the ill-fated ocean liner.",
      ru: "Юная аристократка и бедный художник влюбляются друг в друга на борту обречённого лайнера.",
    },
  },
];
