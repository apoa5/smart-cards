"""Original synthetic passages with reference facts, ordered for sampling."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Passage:
    id: str
    domain: str
    facts: tuple[str, ...]

    @property
    def text(self):
        return " ".join(self.facts)


PASSAGES = (
    Passage("algorithms", "Computer science", (
        "Linear search checks items in sequence and works on an unsorted list.",
        "Binary search requires a sorted list and halves the remaining search interval each step.",
        "A failed search means the target is absent under the chosen comparison rule.",
        "A linear search makes at most n comparisons on a list of n items.",
        "An empty list has no matching item.",
        "If duplicates exist, a linear search that stops at the first match returns the first matching index.",
    )),
    Passage("plant-cells", "Biology", (
        "A plant cell membrane controls exchange with its surroundings.",
        "A cellulose cell wall helps support the cell.",
        "Chloroplasts capture light energy for photosynthesis in green tissues.",
        "The central vacuole stores water and contributes to turgor pressure.",
        "The nucleus contains most of the cell's DNA.",
        "Mitochondria release usable energy during cellular respiration.",
    )),
    Passage("heat-transfer", "General science", (
        "Conduction transfers thermal energy through direct interactions within or between materials.",
        "Convection transfers thermal energy through bulk motion of a liquid or gas.",
        "Thermal radiation travels as electromagnetic waves and can cross a vacuum.",
        "Net heat transfer between objects at different temperatures is from the hotter object to the cooler object.",
        "Insulation slows heat transfer.",
        "At thermal equilibrium, there is no net heat flow between objects in thermal contact.",
    )),
    Passage("data-structures", "Computer science", (
        "A stack removes the most recently added item first.",
        "A queue removes the earliest added item first.",
        "Push adds an item to the top of a stack.",
        "Pop removes the top item of a nonempty stack.",
        "Enqueue adds an item to the rear of a queue.",
        "Dequeue removes the front item of a nonempty queue.",
        "Peeking at the next item leaves the data structure unchanged.",
    )),
    Passage("ecosystems", "Biology", (
        "Producers make organic molecules from inorganic starting materials using an energy source.",
        "Consumers obtain organic matter by feeding on other organisms.",
        "Decomposers break down dead organic material and help recycle nutrients.",
        "A food chain describes one path of feeding relationships.",
        "A food web includes multiple interconnected feeding paths.",
        "Plants are producers in many land ecosystems.",
        "Fungi and bacteria can act as decomposers.",
    )),
    Passage("circuits", "General science", (
        "Electric current is the rate at which charge passes a point.",
        "Current is measured in amperes.",
        "Voltage is energy transferred per unit charge and is measured in volts.",
        "Resistance is measured in ohms.",
        "For an ohmic resistor at constant temperature, voltage equals current times resistance.",
        "Components in a single series loop carry the same current.",
        "Parallel branches connected across the same two nodes share the same voltage.",
    )),
    Passage("binary", "Computer science", (
        "Binary notation uses the digits zero and one.",
        "Bit positions represent successive powers of two.",
        "The rightmost bit of a binary integer represents one.",
        "The position immediately to its left represents two.",
        "Binary 101 represents decimal five.",
        "An unsigned three-bit value ranges from zero through seven.",
    )),
    Passage("human-digestion", "Biology", (
        "Chewing breaks food into smaller pieces.",
        "Salivary amylase begins breaking down starch in the mouth.",
        "The esophagus transports swallowed food to the stomach.",
        "The stomach mixes food with gastric juices.",
        "Most nutrient absorption occurs in the small intestine.",
        "The large intestine absorbs water from remaining material.",
    )),
    Passage("water-states", "General science", (
        "Melting converts solid water into liquid water.",
        "Freezing converts liquid water into solid water.",
        "Evaporation takes place at the surface of a liquid.",
        "Boiling forms vapor bubbles throughout a liquid.",
        "Condensation converts water vapor into liquid water.",
        "At standard atmospheric pressure, pure water boils at about 100 degrees Celsius.",
    )),
    Passage("relational-data", "Computer science", (
        "A relational table organizes records in rows and attributes in columns.",
        "A primary key uniquely identifies a row.",
        "A foreign key can reference a key in another table.",
        "A filter selects rows according to a condition.",
        "A projection selects columns in the result.",
        "A join combines rows using a specified matching condition.",
    )),
    Passage("inheritance", "Biology", (
        "DNA is made of nucleotides.",
        "A gene is a DNA sequence with a functional product.",
        "Alleles are alternative versions of a genetic sequence at a locus.",
        "In typical diploid organisms, an individual inherits one copy of each autosome from each parent.",
        "Homozygous means having two identical alleles at a locus.",
        "Heterozygous means having two different alleles at a locus.",
    )),
    Passage("moon-phases", "General science", (
        "The Moon reflects sunlight.",
        "Except during eclipses, the Sun illuminates approximately half of the Moon.",
        "The Moon's phase depends on how much of the illuminated part is visible from Earth.",
        "At new moon, the side facing Earth is mostly unlit.",
        "At full moon, the side facing Earth is mostly illuminated.",
        "The phase cycle lasts about 29.5 days.",
    )),
)
