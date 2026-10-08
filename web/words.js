/* Keyboard Kickoff word + sentence banks. All original, kid-friendly, generic sports & school vocabulary.
   No real-world stats, scores or roster facts. */
(function (root) {
  const W = {};
  W.homeRow = ["add","ask","dad","fall","glad","sad","flask","salad","hall","half","dash","flag","all","has","had","lad",
    "shall","salsa","ash","lash","flash","sash","gas","hash","glass","alas","lass","gala","jag","hag","lag","sag","fad","gal"];
  // big general bank, filtered per lesson by allowed letters
  W.sports = ["goal","shoot","pass","field","fast","play","player","power","huddle","jersey","keeper","dugout","relay","first",
    "third","four","eight","quarter","spirit","hustle","leap","hope","study","history","story","writer","outfield","safety",
    "playoff","fly","slide","steal","header","goalpost","trophy","upset","repeat","yard","hike","throw","strike","sprint",
    "kick","kickoff","pitch","catch","coach","cleats","corner","dribble","defense","offense","striker","winger","midfield",
    "penalty","referee","whistle","inning","batter","bunt","double","triple","homer","glove","helmet","mound","bases","fence",
    "touchdown","tackle","huddle","blitz","punt","field goal","quarterback","receiver","sideline","end zone","halftime",
    "stadium","crowd","cheer","banner","mascot","team","teammate","captain","practice","warmup","stretch","water","snack",
    "score","tie","win","match","season","league","trophy","medal","jump","swing","volley","rebound","dunk","layup","court",
    "net","hoop","ball","bat","base","run","slide","safe","out","foul","save","shot","post","bar","turf","grass","lines",
    "spin","curve","sinker","slider","changeup","fastball","shortstop","catcher","pitcher","umpire","bullpen","dugout",
    "jog","race","lap","finish","start","speed","agile","focus","grit","hustle","effort","pride","fair","sport","rally"];
  W.school = ["school","class","homework","teacher","pencil","eraser","notebook","binder","folder","locker","recess","lunch",
    "science","history","reading","writing","spelling","math","fraction","decimal","equation","essay","paragraph","sentence",
    "chapter","library","project","poster","quiz","test","grade","report","research","planet","energy","atom","map","globe",
    "history","poem","story","novel","author","journal","art","music","band","choir","gym","bus","schedule","calendar",
    "laptop","keyboard","typing","practice","question","answer","idea","detail","evidence","claim","reason","summary",
    "title","margin","period","comma","colon","capital","vowel","verb","noun","adjective","adverb","subject","topic",
    "outline","draft","revise","edit","publish","rubric","partner","group","friend","kindness","courage","respect"];
  W.short = ["goal","kick","pass","ball","run","bat","base","save","shot","win","team","play","fast","jump","net","hoop",
    "yard","punt","safe","out","tie","lap","race","map","quiz","test","art","band","gym","bus","math","idea","poem","cheer",
    "glove","fence","score","crowd","field","pitch","catch","coach","swing","speed","focus","grit","pride","rally","lunch","class"];
  W.medium = ["keeper","dugout","player","corner","dribble","striker","winger","inning","batter","double","triple","helmet",
    "tackle","huddle","stadium","banner","mascot","captain","practice","warmup","stretch","season","league","trophy","volley",
    "rebound","finish","effort","school","teacher","pencil","eraser","locker","recess","science","history","reading","writing",
    "planet","energy","journal","partner","courage","respect","laptop","summary","outline","chapter","project","poster"];
  W.long = ["midfielder","penalty","referee","whistle","touchdown","quarterback","receiver","sideline","halftime","shortstop",
    "fastball","changeup","outfield","goalkeeper","championship","scoreboard","teammates","defender","homework","notebook",
    "paragraph","sentence","equation","fraction","research","evidence","adjective","schedule","calendar","keyboard","question",
    "kindness","determination","sportsmanship","celebration","concentrate","encourage","confidence","persistence","strategy",
    "assignment","vocabulary","presentation","experiment","photosynthesis","democracy","geography","literature","character"];
  W.teams = ["Ravens","Orioles","Chelsea","Terps","Hornets","Blues","Birds","Turtles"];
  W.capsPunct = [
    "Go, Ravens! Go, Orioles! Go, Terps!",
    "Char passes to Vic. Vic shoots. Goal!",
    "Is it game day? Yes, it is!",
    "Chelsea fans sing loud on match day.",
    "Fear the Turtle, Terps fans!",
    "Wow! What a catch by the shortstop.",
    "Coach said, \"Keep your eyes up.\"",
    "The Hornets huddle up; the crowd cheers.",
    "Ready, set, go! Type it clean.",
    "Maryland, Baltimore, and Annapolis."
  ];
  W.numbers = [
    "1 2 3 4 5 6 7 8 9 0",
    "10 20 30 40 50 60 70 80 90 100",
    "3 strikes and 3 outs",
    "4 quarters and 2 halves",
    "11 players on a soccer team",
    "9 innings in a baseball game",
    "a 50 yard line",
    "page 12, page 34, page 56",
    "jersey 7 and jersey 18",
    "2 goals in 15 minutes"
  ];
  // grade-level sentences (original). vic = 6th grade, char = 8th grade
  W.sentences = {
    vic: [
      "The keeper dove to her left and made a great save.",
      "We practiced corner kicks until the sun went down.",
      "My team cheered when the ball hit the back of the net.",
      "The pitcher took a deep breath and threw a fastball.",
      "I packed my cleats, shin guards, and a water bottle.",
      "Our coach says that every pass should have a purpose.",
      "After school I finish my homework before practice.",
      "The batter tapped the plate and waited for a good pitch.",
      "A strong defense can keep any game close.",
      "We shook hands with the other team after the game.",
      "The crowd stood up when the runner slid into home.",
      "Reading a good book is like a long, quiet road trip.",
      "My science project is about how plants grow toward light.",
      "Typing fast is fun, but typing clean is even better.",
      "The quarterback faked a handoff and threw deep."
    ],
    char: [
      "Although it started to rain, our team kept passing the ball with confidence.",
      "The midfielder spotted an open lane and sent a perfect through ball to the striker.",
      "Good writers revise their drafts, because the first try is rarely the best one.",
      "When the referee blew the whistle, both teams jogged back to the center circle.",
      "Our history class is studying how communities change over many generations.",
      "A strong thesis statement tells the reader exactly what the essay will prove.",
      "The goalkeeper organized her defenders before the corner kick, pointing and shouting.",
      "Practice does not make perfect; practice makes progress, one touch at a time.",
      "During halftime, the coach drew a new formation on the small whiteboard.",
      "Evidence from the text makes an argument stronger and much harder to ignore.",
      "The fans in the stands waved banners and sang the whole second half.",
      "Before a big game, I like to stretch, breathe slowly, and picture the first pass.",
      "Photosynthesis turns sunlight, water, and carbon dioxide into energy for plants.",
      "Teamwork means celebrating a teammate's goal as if it were your own.",
      "Clear sentences, varied transitions, and a strong conclusion make an essay shine."
    ]
  };
  W.practice = {
    "Sports sentences": null, // filled from sentences
    "School & writing": [
      "A paragraph needs a topic sentence, supporting details, and a closing thought.",
      "I keep my notebook neat so I can find my notes before a quiz.",
      "Transitions like however, therefore, and for example help ideas flow.",
      "The library is quiet, calm, and full of great stories.",
      "My essay has a hook, a claim, three reasons, and a conclusion.",
      "Asking a good question is the first step of any research project."
    ],
    "Story starters": [
      "The scoreboard flickered, and suddenly the whole stadium went dark.",
      "Nobody expected the new kid to be the fastest runner on the team.",
      "The ball rolled into the woods, and something rolled it back.",
      "On the last day of summer, we found a map in the dugout.",
      "The bus was late, the rain was loud, and the game was about to start.",
      "My lucky socks were missing on the morning of the big final."
    ]
  };
  root.KK_WORDS = W;
})(typeof window !== "undefined" ? window : globalThis);
