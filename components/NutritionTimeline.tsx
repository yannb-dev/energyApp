import type { NutritionTimeline as NutritionTimelineData, TimelinePoint } from "@/lib/nutrition";

/** Graphe écrit à la main : viewBox fixe, mise à l'échelle par le CSS, aucun défilement. */
const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 168;
const PAD_LEFT = 38;
const PAD_RIGHT = 10;
const PAD_TOP = 12;
const PAD_BOTTOM = 26;
const PLOT_WIDTH = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = VIEW_HEIGHT - PAD_TOP - PAD_BOTTOM;

type SeriesKey = "carbsG" | "sodiumMg";

const GRAPHS: { key: SeriesKey; title: string; stroke: string }[] = [
  { key: "carbsG", title: "Glucides cumulés (g)", stroke: "stroke-effort" },
  { key: "sodiumMg", title: "Sodium cumulé (mg)", stroke: "stroke-accent" },
];

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Graduations de l'axe X : 15, 30 ou 60 min selon la durée. */
function tickStep(minutes: number): number {
  if (minutes <= 60) {
    return 15;
  }
  if (minutes <= 180) {
    return 30;
  }
  return 60;
}

function axisTicks(max: number, step: number): number[] {
  const ticks: number[] = [];
  for (let value = 0; value <= max; value += step) {
    ticks.push(value);
  }
  return ticks;
}

/** Borne haute de l'axe Y : maximum affiché, arrondi au-dessus avec une marge. */
function axisMax(value: number): number {
  const withMargin = Math.max(value, 1) * 1.1;
  const step = withMargin >= 100 ? 50 : withMargin >= 20 ? 10 : 5;
  return Math.ceil(withMargin / step) * step;
}

/** Courbe cumulée en escalier : chaque prise ajoute une marche. */
function stairPath(
  points: TimelinePoint[],
  key: SeriesKey,
  scaleX: (minute: number) => number,
  scaleY: (value: number) => number,
): string {
  const [first, ...rest] = points;
  let previous = first[key];
  const commands = [`M ${scaleX(first.minute)} ${scaleY(previous)}`];

  for (const point of rest) {
    commands.push(`L ${scaleX(point.minute)} ${scaleY(previous)}`);
    commands.push(`L ${scaleX(point.minute)} ${scaleY(point[key])}`);
    previous = point[key];
  }

  return commands.join(" ");
}

function plural(count: number, one: string, many: string): string {
  return count > 1 ? many : one;
}

/** Résumé lu par les lecteurs d'écran : les données restent aussi en texte. */
function summary(timeline: NutritionTimelineData): string {
  const solids = timeline.events.filter((event) => event.kind === "solid").length;
  const drinks = timeline.events.filter((event) => event.kind === "drink").length;
  const last = timeline.series[timeline.series.length - 1];
  const cap = timeline.capLines.carbsG.to.value;

  return `${solids} ${plural(solids, "prise solide", "prises solides")} et ${drinks} ${plural(
    drinks,
    "gorgée",
    "gorgées",
  )} sur ${timeline.minutes} min, ${Math.round(last.carbsG)} g de glucides pour un plafond de ${Math.round(cap)} g`;
}

type NutritionTimelineProps = {
  timeline: NutritionTimelineData;
};

export default function NutritionTimeline({ timeline }: NutritionTimelineProps) {
  const minutes = Math.max(timeline.minutes, 1);
  const lastPoint = timeline.series[timeline.series.length - 1];

  const scaleX = (minute: number) => round(PAD_LEFT + (minute / minutes) * PLOT_WIDTH);

  return (
    <div
      data-testid="nutrition-timeline"
      role="img"
      aria-label={summary(timeline)}
      className="motion-safe:animate-rise flex flex-col gap-4"
    >
      {GRAPHS.map((graph, graphIndex) => {
        const capLine = timeline.capLines[graph.key];
        const yMax = axisMax(Math.max(capLine.to.value, lastPoint[graph.key]));
        const scaleY = (value: number) =>
          round(PAD_TOP + PLOT_HEIGHT - (value / yMax) * PLOT_HEIGHT);
        const yTicks = [0, yMax / 2, yMax];

        return (
          <figure key={graph.key}>
            <figcaption className="mb-1 text-xs font-medium text-muted">{graph.title}</figcaption>
            <svg
              aria-hidden="true"
              data-testid="timeline-graph"
              viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
              className="h-auto w-full"
            >
              <line
                x1={PAD_LEFT}
                y1={PAD_TOP + PLOT_HEIGHT}
                x2={VIEW_WIDTH - PAD_RIGHT}
                y2={PAD_TOP + PLOT_HEIGHT}
                className="stroke-line"
                strokeWidth="1"
              />
              <line
                x1={PAD_LEFT}
                y1={PAD_TOP}
                x2={PAD_LEFT}
                y2={PAD_TOP + PLOT_HEIGHT}
                className="stroke-line"
                strokeWidth="1"
              />

              {axisTicks(timeline.minutes, tickStep(timeline.minutes)).map((tick) => (
                <text
                  key={`x-${tick}`}
                  data-testid="timeline-tick-x"
                  x={scaleX(tick)}
                  y={VIEW_HEIGHT - PAD_BOTTOM + 16}
                  textAnchor="middle"
                  fontSize="14"
                  className="fill-muted"
                >
                  {tick}
                </text>
              ))}

              {yTicks.map((tick) => (
                <text
                  key={`y-${tick}`}
                  x={PAD_LEFT - 6}
                  y={scaleY(tick) + 4}
                  textAnchor="end"
                  fontSize="14"
                  className="fill-muted"
                >
                  {Math.round(tick)}
                </text>
              ))}

              <line
                data-testid="timeline-cap-line"
                x1={scaleX(capLine.from.minute)}
                y1={scaleY(capLine.from.value)}
                x2={scaleX(capLine.to.minute)}
                y2={scaleY(capLine.to.value)}
                className="stroke-danger"
                strokeWidth="2"
                strokeDasharray="5 4"
              />

              <path
                d={stairPath(timeline.series, graph.key, scaleX, scaleY)}
                fill="none"
                className={graph.stroke}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Les marqueurs ne sont posés qu'une fois, sur le graphe des glucides. */}
              {graphIndex === 0
                ? timeline.events.map((event, eventIndex) => {
                    const point = timeline.series[eventIndex + 1] ?? lastPoint;
                    return (
                      <circle
                        key={`${event.kind}-${event.minute}`}
                        data-testid="timeline-marker"
                        cx={scaleX(event.minute)}
                        cy={scaleY(point[graph.key])}
                        r={event.kind === "solid" ? 5 : 3.5}
                        className={event.kind === "solid" ? "fill-ink" : "fill-accent"}
                      />
                    );
                  })
                : null}
            </svg>
          </figure>
        );
      })}

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <svg aria-hidden="true" viewBox="0 0 18 6" className="h-1.5 w-4">
            <line
              x1="0"
              y1="3"
              x2="18"
              y2="3"
              className="stroke-danger"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
          </svg>
          Plafond
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink" />
          Prises solides
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" />
          Gorgées de boisson
        </li>
      </ul>
    </div>
  );
}
