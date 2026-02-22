package main

// ---------------------------------------------------------------------------
// Seed data types
// ---------------------------------------------------------------------------

type seedQuestion struct {
	text      string
	qtype     string // "single" | "multi"
	options   []string
	correct   int   // 0-based index for single
	corrMulti []int // indices for multi
	weight    float64
}

type seedTest struct {
	title       string
	description string
	durationSec int
	allowGuests bool
	policy      []byte
	questions   []seedQuestion
}

// ---------------------------------------------------------------------------
// Test catalog — 10 university subjects, all in English
// ---------------------------------------------------------------------------

var seedTests = []seedTest{

	// 1. Introduction to Programming (Python) — CS
	{
		title:       "Introduction to Programming (Python)",
		description: "Fundamentals of Python: syntax, data types, control flow, functions, and OOP basics.",
		durationSec: 1800,
		allowGuests: true,
		policy:      defaultPolicy(),
		questions: []seedQuestion{
			{
				text:    "What will `print(type(3.14))` output?",
				qtype:   "single",
				options: []string{"<class 'int'>", "<class 'float'>", "<class 'str'>", "<class 'double'>"},
				correct: 1, weight: 1,
			},
			{
				text:      "Which of the following create an empty list in Python?",
				qtype:     "multi",
				options:   []string{"list()", "[]", "{}", "()"},
				corrMulti: []int{0, 1}, weight: 1.5,
			},
			{
				text:  "What is a list comprehension?",
				qtype: "single",
				options: []string{
					"A for-loop inside square brackets that produces a list",
					"A built-in method to compress a list",
					"A built-in sorting function",
					"Syntactic sugar for dictionaries",
				},
				correct: 0, weight: 1,
			},
			{
				text:  "What is the difference between `is` and `==` in Python?",
				qtype: "single",
				options: []string{
					"`is` checks object identity (same object in memory); `==` checks value equality",
					"`is` checks the type; `==` checks the value",
					"There is no difference — they are interchangeable",
					"`is` only works with numbers",
				},
				correct: 0, weight: 1,
			},
			{
				text:    "Which keyword is used to define a generator function?",
				qtype:   "single",
				options: []string{"return", "yield", "async", "generate"},
				correct: 1, weight: 1,
			},
			{
				text:  "What does the `@staticmethod` decorator do?",
				qtype: "single",
				options: []string{
					"Prevents modification of class attributes",
					"Allows calling a method without an instance, with no access to `self` or `cls`",
					"Caches the method's return value",
					"Makes the method private",
				},
				correct: 1, weight: 1,
			},
			{
				text:      "Which of the following Python types are mutable?",
				qtype:     "multi",
				options:   []string{"list", "tuple", "dict", "str", "set"},
				corrMulti: []int{0, 2, 4}, weight: 2,
			},
			{
				text:    "What does `[1, 2, 3][::-1]` return?",
				qtype:   "single",
				options: []string{"[3, 2, 1]", "[1, 2, 3]", "[2, 1]", "An error"},
				correct: 0, weight: 1,
			},
			{
				text:    "What OOP principle allows one interface to work with different types?",
				qtype:   "single",
				options: []string{"Encapsulation", "Inheritance", "Polymorphism", "Abstraction"},
				correct: 2, weight: 1,
			},
			{
				text:    "What happens when you divide an integer by zero in Python?",
				qtype:   "single",
				options: []string{"Returns Infinity", "Returns 0", "Raises ZeroDivisionError", "Returns None"},
				correct: 2, weight: 1,
			},
		},
	},

	// 2. Data Structures & Algorithms — CS
	{
		title:       "Data Structures & Algorithms",
		description: "Algorithm complexity (Big O), sorting, searching, stacks, queues, trees, and graphs.",
		durationSec: 2700,
		allowGuests: false,
		policy:      timedPolicy(2700),
		questions: []seedQuestion{
			{
				text:    "What is the average-case time complexity of a hash-table lookup?",
				qtype:   "single",
				options: []string{"O(n)", "O(log n)", "O(1)", "O(n²)"},
				correct: 2, weight: 1,
			},
			{
				text:    "Which sorting algorithm guarantees O(n log n) in the best, average, and worst cases?",
				qtype:   "single",
				options: []string{"Quick Sort", "Bubble Sort", "Merge Sort", "Insertion Sort"},
				correct: 2, weight: 1.5,
			},
			{
				text:      "Which of the following are traversal algorithms for graphs?",
				qtype:     "multi",
				options:   []string{"Binary Search", "Bubble Sort", "BFS", "DFS", "Quick Sort"},
				corrMulti: []int{2, 3}, weight: 1.5,
			},
			{
				text:    "What data structure follows the LIFO (Last In, First Out) principle?",
				qtype:   "single",
				options: []string{"Queue", "Stack", "Deque", "Heap"},
				correct: 1, weight: 1,
			},
			{
				text:    "What is the time complexity of accessing an element in an array by index?",
				qtype:   "single",
				options: []string{"O(n)", "O(log n)", "O(1)", "O(n log n)"},
				correct: 2, weight: 1,
			},
			{
				text:  "Which property correctly describes a Binary Search Tree (BST)?",
				qtype: "single",
				options: []string{
					"Every node has at most two children; left child key < node key ≤ right child key",
					"All leaves are at the same depth",
					"Optimized for string storage",
					"A complete graph without cycles",
				},
				correct: 0, weight: 1.5,
			},
			{
				text:  "What is recursion?",
				qtype: "single",
				options: []string{
					"A function that calls another function in a chain",
					"A function that calls itself with modified arguments until a base case is reached",
					"An iterative loop running in reverse",
					"A memory optimization technique",
				},
				correct: 1, weight: 1,
			},
			{
				text:  "Which statements about BFS and DFS are true?",
				qtype: "multi",
				options: []string{
					"BFS explores nodes level by level",
					"DFS explores as far as possible before backtracking",
					"BFS uses a stack internally",
					"DFS uses a queue internally",
				},
				corrMulti: []int{0, 1}, weight: 2,
			},
		},
	},

	// 3. Relational Databases & SQL — CS / Information Systems
	{
		title:       "Relational Databases & SQL",
		description: "Relational model, SQL operators, indexes, transactions, and normal forms.",
		durationSec: 1500,
		allowGuests: true,
		policy:      defaultPolicy(),
		questions: []seedQuestion{
			{
				text:  "What does an INNER JOIN return?",
				qtype: "single",
				options: []string{
					"All rows from the left table",
					"Only rows with matching values in both tables",
					"All rows from both tables with no conditions",
					"Rows from the right table not present in the left",
				},
				correct: 1, weight: 1,
			},
			{
				text:    "Which normal form requires every non-key attribute to be fully dependent on the entire primary key?",
				qtype:   "single",
				options: []string{"1NF", "2NF", "3NF", "BCNF"},
				correct: 1, weight: 1.5,
			},
			{
				text:      "Which properties are guaranteed by an ACID transaction?",
				qtype:     "multi",
				options:   []string{"Atomicity", "Consistency", "Independence", "Isolation", "Durability"},
				corrMulti: []int{0, 1, 3, 4}, weight: 2,
			},
			{
				text:  "What is a database index?",
				qtype: "single",
				options: []string{
					"A backup copy of a table",
					"A data structure that speeds up lookups by storing sorted references",
					"A unique value constraint",
					"A synonym for a primary key",
				},
				correct: 1, weight: 1,
			},
			{
				text:  "What does `GROUP BY` without `HAVING` do?",
				qtype: "single",
				options: []string{
					"Filters rows before grouping",
					"Groups rows by a column value, enabling aggregate functions",
					"Sorts the result set",
					"Removes duplicates from the table",
				},
				correct: 1, weight: 1,
			},
			{
				text:  "Which differences between TRUNCATE and DELETE are correct?",
				qtype: "multi",
				options: []string{
					"TRUNCATE is faster for removing all rows",
					"TRUNCATE cannot be rolled back in most DBMS",
					"DELETE supports a WHERE clause",
					"TRUNCATE resets the auto-increment counter",
				},
				corrMulti: []int{0, 1, 2, 3}, weight: 2,
			},
			{
				text:  "What is a foreign key?",
				qtype: "single",
				options: []string{
					"A unique row identifier",
					"A reference to the primary key of another table, enforcing referential integrity",
					"An index that speeds up JOIN operations",
					"An encrypted primary key",
				},
				correct: 1, weight: 1,
			},
			{
				text:  "What will `SELECT COUNT(*) FROM users WHERE deleted_at IS NULL` return?",
				qtype: "single",
				options: []string{
					"The total number of users including deleted ones",
					"The number of non-deleted (active) users",
					"A syntax error",
					"NULL",
				},
				correct: 1, weight: 1,
			},
		},
	},

	// 4. Calculus I — Mathematics
	{
		title:       "Calculus I — Limits, Derivatives & Integrals",
		description: "Single-variable calculus: limits, continuity, differentiation rules, and definite integrals.",
		durationSec: 2400,
		allowGuests: false,
		policy:      timedPolicy(2400),
		questions: []seedQuestion{
			{
				text:    "What is the derivative of f(x) = x³ − 5x + 2?",
				qtype:   "single",
				options: []string{"3x² − 5", "3x² + 2", "x² − 5", "3x − 5"},
				correct: 0, weight: 1,
			},
			{
				text:      "Which of the following are standard differentiation rules?",
				qtype:     "multi",
				options:   []string{"Power rule", "Chain rule", "Product rule", "Remainder rule", "Quotient rule"},
				corrMulti: []int{0, 1, 2, 4}, weight: 2,
			},
			{
				text:    "What is lim(x→0) sin(x)/x?",
				qtype:   "single",
				options: []string{"0", "1", "∞", "Undefined"},
				correct: 1, weight: 1.5,
			},
			{
				text:  "What does the Fundamental Theorem of Calculus relate?",
				qtype: "single",
				options: []string{
					"Limits and continuity",
					"Differentiation and integration as inverse operations",
					"Sequences and series",
					"Partial derivatives and gradients",
				},
				correct: 1, weight: 1,
			},
			{
				text:    "What is ∫ 2x dx?",
				qtype:   "single",
				options: []string{"2x² + C", "x² + C", "x + C", "2 + C"},
				correct: 1, weight: 1,
			},
			{
				text:  "A function is continuous at x = a if which conditions hold?",
				qtype: "multi",
				options: []string{
					"f(a) is defined",
					"lim(x→a) f(x) exists",
					"lim(x→a) f(x) = f(a)",
					"f'(a) exists",
				},
				corrMulti: []int{0, 1, 2}, weight: 2,
			},
			{
				text:  "What does a negative second derivative at a critical point indicate?",
				qtype: "single",
				options: []string{
					"The function has a local minimum at that point",
					"The function has a local maximum at that point",
					"The function is increasing",
					"The function has an inflection point",
				},
				correct: 1, weight: 1,
			},
			{
				text:    "Which rule is used to differentiate f(g(x))?",
				qtype:   "single",
				options: []string{"Product rule", "Quotient rule", "Chain rule", "Power rule"},
				correct: 2, weight: 1,
			},
			{
				text:    "What is the derivative of e^x?",
				qtype:   "single",
				options: []string{"xe^(x−1)", "e^x", "ln(x)", "1/x"},
				correct: 1, weight: 1,
			},
			{
				text:    "Evaluate ∫₀¹ x² dx.",
				qtype:   "single",
				options: []string{"1/2", "1/3", "2/3", "1"},
				correct: 1, weight: 1.5,
			},
		},
	},

	// 5. General Physics I — Classical Mechanics
	{
		title:       "General Physics I — Classical Mechanics",
		description: "Kinematics, Newton's laws, work and energy, momentum, and rotational motion.",
		durationSec: 2400,
		allowGuests: false,
		policy:      defaultPolicy(),
		questions: []seedQuestion{
			{
				text:    "A car accelerates from 0 to 30 m/s in 10 s. What is the acceleration?",
				qtype:   "single",
				options: []string{"3 m/s²", "300 m/s²", "0.33 m/s²", "30 m/s²"},
				correct: 0, weight: 1,
			},
			{
				text:    "Which of Newton's laws states that for every action there is an equal and opposite reaction?",
				qtype:   "single",
				options: []string{"First law", "Second law", "Third law", "Law of gravitation"},
				correct: 2, weight: 1,
			},
			{
				text:      "Which quantities are conserved in a perfectly elastic collision?",
				qtype:     "multi",
				options:   []string{"Momentum", "Kinetic energy", "Total mechanical energy", "Velocity"},
				corrMulti: []int{0, 1, 2}, weight: 2,
			},
			{
				text:    "What is the SI unit of force?",
				qtype:   "single",
				options: []string{"Joule", "Watt", "Newton", "Pascal"},
				correct: 2, weight: 1,
			},
			{
				text:  "Work done by a force is defined as:",
				qtype: "single",
				options: []string{
					"Force divided by displacement",
					"Force multiplied by displacement in the direction of force",
					"Mass multiplied by acceleration",
					"Change in potential energy",
				},
				correct: 1, weight: 1,
			},
			{
				text:  "A ball is thrown vertically upward. At the highest point, which statement is true?",
				qtype: "single",
				options: []string{
					"Velocity and acceleration are both zero",
					"Velocity is zero; acceleration equals g downward",
					"Velocity is maximum; acceleration is zero",
					"Both velocity and acceleration are at maximum",
				},
				correct: 1, weight: 1.5,
			},
			{
				text:      "Which of the following are examples of conservative forces?",
				qtype:     "multi",
				options:   []string{"Gravity", "Friction", "Spring elastic force", "Air resistance", "Normal force"},
				corrMulti: []int{0, 2}, weight: 2,
			},
			{
				text:      "The moment of inertia of a rotating object depends on:",
				qtype:     "multi",
				options:   []string{"Mass of the object", "Distribution of mass relative to the axis", "Shape of the object", "The gravitational constant"},
				corrMulti: []int{0, 1, 2}, weight: 1.5,
			},
			{
				text:    "What is the kinetic energy of a 2 kg object moving at 4 m/s?",
				qtype:   "single",
				options: []string{"8 J", "16 J", "32 J", "4 J"},
				correct: 1, weight: 1,
			},
			{
				text:  "Centripetal acceleration is directed:",
				qtype: "single",
				options: []string{
					"Tangentially to the circular path",
					"Away from the center of the circle",
					"Toward the center of the circle",
					"Perpendicular to the plane of the circle",
				},
				correct: 2, weight: 1,
			},
		},
	},

	// 6. Introduction to Economics
	{
		title:       "Introduction to Economics",
		description: "Microeconomics fundamentals: supply and demand, elasticity, market structures, and basic macroeconomics.",
		durationSec: 1800,
		allowGuests: true,
		policy:      defaultPolicy(),
		questions: []seedQuestion{
			{
				text:    "According to the Law of Demand, as price increases, quantity demanded:",
				qtype:   "single",
				options: []string{"Increases", "Decreases", "Stays the same", "First increases, then decreases"},
				correct: 1, weight: 1,
			},
			{
				text:  "What does Price Elasticity of Demand measure?",
				qtype: "single",
				options: []string{
					"How supply responds to a change in price",
					"How much quantity demanded changes in response to a price change",
					"The maximum price consumers are willing to pay",
					"The profit margin of producers",
				},
				correct: 1, weight: 1,
			},
			{
				text:      "Which market structure is characterized by many sellers with differentiated products?",
				qtype:     "multi",
				options:   []string{"Perfect competition", "Monopoly", "Monopolistic competition", "Oligopoly"},
				corrMulti: []int{2}, weight: 1.5,
			},
			{
				text:  "What is GDP?",
				qtype: "single",
				options: []string{
					"The total value of a country's exports minus imports",
					"The total market value of all final goods and services produced in a country in a given period",
					"The total government spending in an economy",
					"The average income of citizens in a country",
				},
				correct: 1, weight: 1,
			},
			{
				text:  "What shifts the supply curve to the right?",
				qtype: "multi",
				options: []string{
					"Decrease in production costs",
					"Increase in the price of the good",
					"Improvement in production technology",
					"Increase in taxes on producers",
				},
				corrMulti: []int{0, 2}, weight: 2,
			},
			{
				text:  "Opportunity cost is best defined as:",
				qtype: "single",
				options: []string{
					"The monetary cost of producing a good",
					"The value of the next best alternative foregone when making a choice",
					"The total cost of all inputs",
					"The price set by the government",
				},
				correct: 1, weight: 1,
			},
			{
				text:    "When a good has a price elasticity of demand of 0.3, demand is considered:",
				qtype:   "single",
				options: []string{"Elastic", "Inelastic", "Perfectly elastic", "Unit elastic"},
				correct: 1, weight: 1,
			},
			{
				text:      "Which of the following are examples of macroeconomic indicators?",
				qtype:     "multi",
				options:   []string{"Inflation rate", "Price of a single stock", "Unemployment rate", "GDP growth", "Firm's revenue"},
				corrMulti: []int{0, 2, 3}, weight: 1.5,
			},
		},
	},

	// 7. Organic Chemistry — Fundamentals
	{
		title:       "Organic Chemistry — Fundamentals",
		description: "Functional groups, reaction mechanisms, nomenclature, and stereochemistry basics.",
		durationSec: 2700,
		allowGuests: false,
		policy:      timedPolicy(2700),
		questions: []seedQuestion{
			{
				text:    "Which functional group is characteristic of alcohols?",
				qtype:   "single",
				options: []string{"−COOH", "−OH", "−NH₂", "−CHO"},
				correct: 1, weight: 1,
			},
			{
				text:    "What is the IUPAC name of CH₃−CH₂−CH₃?",
				qtype:   "single",
				options: []string{"Methane", "Ethane", "Propane", "Butane"},
				correct: 2, weight: 1,
			},
			{
				text:      "Which of the following are types of isomerism?",
				qtype:     "multi",
				options:   []string{"Structural isomerism", "Stereoisomerism", "Positional isomerism", "Covalent isomerism"},
				corrMulti: []int{0, 1, 2}, weight: 2,
			},
			{
				text:    "What type of reaction converts an alkene to an alkane?",
				qtype:   "single",
				options: []string{"Oxidation", "Substitution", "Hydrogenation (addition)", "Elimination"},
				correct: 2, weight: 1,
			},
			{
				text:  "Which statement about SN2 reactions is correct?",
				qtype: "single",
				options: []string{
					"They proceed via a carbocation intermediate",
					"The reaction rate depends only on the concentration of the substrate",
					"They involve backside attack and inversion of configuration",
					"They are favored by tertiary substrates",
				},
				correct: 2, weight: 1.5,
			},
			{
				text:    "What is the hybridization of carbon in benzene?",
				qtype:   "single",
				options: []string{"sp", "sp²", "sp³", "sp³d"},
				correct: 1, weight: 1,
			},
			{
				text:      "Which functional groups are found in amino acids?",
				qtype:     "multi",
				options:   []string{"Amino group (−NH₂)", "Carboxyl group (−COOH)", "Hydroxyl group (−OH)", "Phosphate group"},
				corrMulti: []int{0, 1}, weight: 2,
			},
			{
				text:  "Enantiomers are stereoisomers that:",
				qtype: "single",
				options: []string{
					"Differ only in the position of one functional group",
					"Are non-superimposable mirror images of each other",
					"Have the same physical and chemical properties in all environments",
					"Differ in the number of double bonds",
				},
				correct: 1, weight: 1.5,
			},
			{
				text:    "What reagent is typically used to test for an aldehyde group?",
				qtype:   "single",
				options: []string{"Fehling's solution", "Bromine water", "Tollens' reagent", "Both A and C"},
				correct: 3, weight: 1,
			},
		},
	},

	// 8. World History: The 20th Century
	{
		title:       "World History: The 20th Century",
		description: "Major events of the 20th century: World Wars, Cold War, decolonization, and globalization.",
		durationSec: 1800,
		allowGuests: true,
		policy:      defaultPolicy(),
		questions: []seedQuestion{
			{
				text:  "Which event is widely considered the direct trigger of World War I?",
				qtype: "single",
				options: []string{
					"The sinking of the Lusitania",
					"The assassination of Archduke Franz Ferdinand",
					"Germany's invasion of Poland",
					"The signing of the Treaty of Versailles",
				},
				correct: 1, weight: 1,
			},
			{
				text:  "The Treaty of Versailles (1919) imposed which major consequences on Germany?",
				qtype: "multi",
				options: []string{
					"Territorial losses",
					"Military restrictions",
					"War guilt clause and reparations",
					"Immediate occupation of Berlin",
				},
				corrMulti: []int{0, 1, 2}, weight: 2,
			},
			{
				text:  "What was the primary ideological conflict of the Cold War?",
				qtype: "single",
				options: []string{
					"Capitalism vs. Fascism",
					"Democracy vs. Monarchy",
					"Capitalism (USA) vs. Communism (USSR)",
					"Imperialism vs. Nationalism",
				},
				correct: 2, weight: 1,
			},
			{
				text:  "The Cuban Missile Crisis (1962) was a standoff between:",
				qtype: "single",
				options: []string{
					"Cuba and the USA",
					"The USA and the USSR over Soviet missiles in Cuba",
					"Cuba and the Soviet Union over trade",
					"The USA and Cuba over the Bay of Pigs invasion",
				},
				correct: 1, weight: 1,
			},
			{
				text:      "Which countries were permanent members of the UN Security Council at its founding in 1945?",
				qtype:     "multi",
				options:   []string{"USA", "USSR", "UK", "France", "China", "Germany"},
				corrMulti: []int{0, 1, 2, 3, 4}, weight: 2,
			},
			{
				text:    "The policy of Apartheid was practised in which country?",
				qtype:   "single",
				options: []string{"Zimbabwe", "Kenya", "South Africa", "Nigeria"},
				correct: 2, weight: 1,
			},
			{
				text:  "What caused the Great Depression of the 1930s?",
				qtype: "multi",
				options: []string{
					"Stock market crash of 1929",
					"Collapse of banks and credit systems",
					"World War II destruction",
					"Protectionist trade policies (e.g., Smoot–Hawley Tariff)",
				},
				corrMulti: []int{0, 1, 3}, weight: 2,
			},
			{
				text:  "The fall of the Berlin Wall (1989) symbolized the end of:",
				qtype: "single",
				options: []string{
					"World War II",
					"The Korean War",
					"The Cold War era in Europe",
					"The Vietnam War",
				},
				correct: 2, weight: 1,
			},
		},
	},

	// 9. Introduction to Psychology
	{
		title:       "Introduction to Psychology",
		description: "Core concepts: research methods, biological bases of behavior, sensation, perception, learning, and memory.",
		durationSec: 1800,
		allowGuests: true,
		policy:      defaultPolicy(),
		questions: []seedQuestion{
			{
				text:    "Which research method allows psychologists to establish cause-and-effect relationships?",
				qtype:   "single",
				options: []string{"Case study", "Survey", "Controlled experiment", "Naturalistic observation"},
				correct: 2, weight: 1,
			},
			{
				text:    "Classical conditioning was pioneered by:",
				qtype:   "single",
				options: []string{"B.F. Skinner", "Sigmund Freud", "Ivan Pavlov", "William James"},
				correct: 2, weight: 1,
			},
			{
				text:      "Which of the following are stages of memory processing?",
				qtype:     "multi",
				options:   []string{"Encoding", "Storage", "Retrieval", "Deletion", "Perception"},
				corrMulti: []int{0, 1, 2}, weight: 1.5,
			},
			{
				text:    "Maslow's hierarchy of needs places which level at the top?",
				qtype:   "single",
				options: []string{"Safety needs", "Esteem needs", "Self-actualization", "Physiological needs"},
				correct: 2, weight: 1,
			},
			{
				text:  "What is the difference between short-term memory (STM) and long-term memory (LTM)?",
				qtype: "single",
				options: []string{
					"STM is unlimited in capacity; LTM is limited",
					"STM holds information for seconds to minutes; LTM can hold information for years",
					"LTM is processed in the cerebellum; STM is processed in the brainstem",
					"There is no functional difference between them",
				},
				correct: 1, weight: 1.5,
			},
			{
				text:      "Operant conditioning uses which of the following to modify behavior?",
				qtype:     "multi",
				options:   []string{"Positive reinforcement", "Negative reinforcement", "Punishment", "Classical stimulus"},
				corrMulti: []int{0, 1, 2}, weight: 2,
			},
			{
				text:  "The central nervous system consists of:",
				qtype: "single",
				options: []string{
					"The brain and the spinal cord",
					"The brain and peripheral nerves",
					"The sympathetic and parasympathetic systems",
					"All neurons in the body",
				},
				correct: 0, weight: 1,
			},
			{
				text:    "Which perspective in psychology focuses on unconscious processes and childhood experiences?",
				qtype:   "single",
				options: []string{"Behaviorism", "Humanistic", "Psychoanalytic / Psychodynamic", "Cognitive"},
				correct: 2, weight: 1,
			},
			{
				text:  "The just-noticeable difference (JND) in perception is described by:",
				qtype: "single",
				options: []string{
					"Maslow's hierarchy",
					"Weber's Law",
					"Pavlov's principle",
					"Freud's theory of the unconscious",
				},
				correct: 1, weight: 1,
			},
		},
	},

	// 10. Introduction to Machine Learning — CS / Data Science
	{
		title:       "Introduction to Machine Learning",
		description: "Core ML concepts: types of learning, evaluation metrics, overfitting, and popular algorithms.",
		durationSec: 3000,
		allowGuests: false,
		policy:      defaultPolicy(),
		questions: []seedQuestion{
			{
				text:  "What is overfitting in machine learning?",
				qtype: "single",
				options: []string{
					"The model performs well on training data but poorly on new data",
					"The model is not trained enough and performs poorly on training data",
					"The model takes too long to train",
					"The model uses too much memory",
				},
				correct: 0, weight: 1,
			},
			{
				text:    "Which type of learning is used when labels are unavailable?",
				qtype:   "single",
				options: []string{"Supervised learning", "Unsupervised learning", "Reinforcement learning", "Semi-supervised learning"},
				correct: 1, weight: 1,
			},
			{
				text:  "What does the F1-score measure?",
				qtype: "single",
				options: []string{
					"Classification accuracy only",
					"The harmonic mean of precision and recall",
					"Mean squared error",
					"Model training time",
				},
				correct: 1, weight: 1.5,
			},
			{
				text:  "Which of the following techniques help prevent overfitting?",
				qtype: "multi",
				options: []string{
					"L1/L2 regularization",
					"Increasing model complexity",
					"Dropout",
					"Cross-validation",
					"Training for more epochs",
				},
				corrMulti: []int{0, 2, 3}, weight: 2,
			},
			{
				text:  "What is gradient descent?",
				qtype: "single",
				options: []string{
					"A method for initializing neural network weights",
					"An iterative optimization algorithm that minimizes a loss function",
					"A way to normalize input data",
					"An algorithm for building decision trees",
				},
				correct: 1, weight: 1,
			},
			{
				text:    "Which algorithm builds an ensemble of randomly constructed decision trees?",
				qtype:   "single",
				options: []string{"Logistic Regression", "K-Nearest Neighbors", "Random Forest", "SVM"},
				correct: 2, weight: 1,
			},
			{
				text:  "What is a feature in machine learning?",
				qtype: "single",
				options: []string{
					"The target variable (what we predict)",
					"An input variable — a measurable characteristic of an observation",
					"A model hyperparameter",
					"A layer in a neural network",
				},
				correct: 1, weight: 1,
			},
			{
				text:  "Which of the following are classification tasks?",
				qtype: "multi",
				options: []string{
					"Predicting apartment prices",
					"Detecting spam in emails",
					"Recognizing handwritten digits",
					"Forecasting tomorrow's temperature",
					"Classifying customer sentiment in reviews",
				},
				corrMulti: []int{1, 2, 4}, weight: 1.5,
			},
			{
				text:  "What does MSE (Mean Squared Error) compute?",
				qtype: "single",
				options: []string{
					"Mean absolute deviation",
					"Mean squared deviation of predictions from true values",
					"Fraction of correct predictions",
					"Variance of the training set",
				},
				correct: 1, weight: 1,
			},
			{
				text:  "What is reinforcement learning?",
				qtype: "single",
				options: []string{
					"Learning from labeled data with a teacher",
					"Training an agent to interact with an environment to maximize cumulative reward",
					"Clustering data without labels",
					"A data preprocessing technique",
				},
				correct: 1, weight: 1,
			},
		},
	},
}

// ---------------------------------------------------------------------------
// Student roster
// ---------------------------------------------------------------------------

var students = []struct {
	firstName, lastName, email string
}{
	{"Aliya", "Nurlanova", "aliya.nurlanova@edu.kz"},
	{"Damir", "Seitkali", "damir.seitkali@edu.kz"},
	{"Aigerim", "Bekova", "aigerim.bekova@edu.kz"},
	{"Nurzhan", "Akhmetov", "nurzhan.akhmetov@edu.kz"},
	{"Zhanna", "Seitova", "zhanna.seitova@edu.kz"},
	{"Arman", "Kasymov", "arman.kasymov@edu.kz"},
	{"Dina", "Zhaksybekova", "dina.zhaksybekova@edu.kz"},
	{"Yerlan", "Tasov", "yerlan.tasov@edu.kz"},
	{"Madina", "Ablova", "madina.ablova@edu.kz"},
	{"Askhat", "Mukhamedov", "askhat.mukhamedov@edu.kz"},
	{"Thomas", "Müller", "thomas.mueller@student.de"},
	{"Anna", "Smirnova", "anna.smirnova@student.ru"},
	{"Bekzat", "Urazov", "bekzat.urazov@edu.kz"},
	{"Sabina", "Dzhumanova", "sabina.dzhumanova@edu.kz"},
	{"Artem", "Kozlov", "artem.kozlov@student.ru"},
	{"Lena", "Fischer", "lena.fischer@student.de"},
	{"Marcus", "Johnson", "marcus.johnson@uni.us"},
	{"Priya", "Sharma", "priya.sharma@uni.in"},
}

// Assignment metadata — one per test, same order as seedTests
var assignmentMeta = []struct{ title, comment string }{
	{"CS-101 Group A — Midterm Exam", "Midterm exam for Introduction to Programming. Documentation allowed."},
	{"CS-301 Group B — Final Test", "Final assessment on Data Structures & Algorithms. Closed book."},
	{"IS-201 Group A — SQL Quiz", "SQL quiz for Information Systems students. 25 minutes."},
	{"MATH-101 Group C — Calculus Exam", "Calculus I midterm. Formula sheet provided."},
	{"PHYS-101 Group A — Physics Test", "Classical Mechanics test. Calculators permitted."},
	{"ECON-101 Group B — Economics Quiz", "Open-book quiz on microeconomics fundamentals."},
	{"CHEM-201 Group A — Organic Chem Exam", "Organic Chemistry final exam. Periodic table provided."},
	{"HIST-201 Group D — History Test", "20th Century World History test."},
	{"PSY-101 Group C — Psychology Quiz", "Introduction to Psychology quiz. No notes."},
	{"DS-301 Group A — ML Exam", "Machine Learning final exam for Data Science track."},
}
