export interface CreativeItem {
  id: number;
  title: string;
  subtitle: string;
  category: string;
  src: string;
  aspect: number;
}

const TITLES = [
  "Spatial Typography",
  "Kinetic Geometry",
  "Neural Fluidity",
  "Atmospheric Waves",
  "Monolith Studies",
  "Architectural Void",
  "Crystalline Matrix",
  "Chrono Horizons",
  "Prismatic Field",
  "Orbital Symmetry",
  "Echoes in Obsidian",
  "Vapor Structures",
  "Refractive Pulse",
  "Quantum Horizon",
  "Hyper-Dimensional",
  "Luminescent Flux",
  "Tectonic Geometry",
  "Digital Artifacts",
  "Super-Position",
  "Sonic Topology",
  "Synaptic Glow",
  "Aether Dynamics",
  "Planar Disruption",
  "Zero Gravity",
  "Cosmic Lattice",
];

const CATEGORIES = [
  "Visual Identity",
  "Interactive Experience",
  "Spatial Design",
  "Creative Tech",
  "Editorial Art Direction",
  "Motion System",
];

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const CREATIVE_ITEMS: CreativeItem[] = Array.from(
  { length: 18 },
  (_, index) => {
    const id = index + 1;
    const title = TITLES[index] ?? `Exploration ${String(id).padStart(3, "0")}`;
    const category = CATEGORIES[index % CATEGORIES.length];

    return {
      aspect: 0.75,
      category,
      id,
      src: `${basePath}/media/placeholder/${id}.png`,
      subtitle: `${category} — 2026`,
      title,
    };
  }
);
