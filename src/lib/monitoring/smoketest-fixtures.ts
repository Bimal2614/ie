import type { SpeakingPart } from "@/lib/speech/ielts-speaking";
import type { WritingTaskType } from "@/lib/writing/openai";

/**
 * The answers the AI smoke test submits — real candidate work, frozen.
 *
 * WHY THE QUESTION TEXT IS COPIED IN HERE rather than read from the `questions`
 * table at run time. A probe has to fail for exactly one reason, and every
 * dependency it takes on is another way for it to cry wolf: content is
 * re-imported, ids are reissued (these very rows survived a purge that changed
 * nothing about the AI services), a set is deactivated, a database is slow —
 * and the on-call reads "Speaking AI down" for none of those. Frozen text also
 * means the probe behaves identically on local, staging and production, and
 * that a drifting band is the services drifting rather than the prompt moving
 * underneath it.
 *
 * `source` records where each one came from so the pair can be re-read (or
 * refreshed) later; nothing at run time resolves it.
 *
 * THE RECORDINGS ARE NOT FROZEN — they cannot be. `audioUrl` points at the
 * objects in S3 exactly as a candidate's answer row does, and the probe presigns
 * them through the same helper the scorer uses. That is on purpose: presigning
 * and the service's ability to fetch what we signed are part of what "speaking
 * scoring works" means, and a probe that skipped them would stay green while
 * every real answer failed to be fetched.
 *
 * KEEP THEM ORDINARY. These are mid-band answers, not showcase ones: an answer
 * that scores 8 leaves the threshold untested, and one that scores 4.5 makes
 * the alert fire on model variance rather than on an outage.
 *
 * ALL OF THEM RUN, EVERY RUN. An earlier version sampled one per group to keep
 * the per-run cost down, and paid for it twice over: which fixture ran varied,
 * so a report was never comparable with yesterday's, and a recording that had
 * quietly stopped being fetchable could go a fortnight without being noticed.
 * Once a day over the whole catalogue is eleven provider calls, which is the
 * cheaper mistake — and it makes every run the same run, so a change in the
 * bands is a change in the services.
 */

/** Which service a check exercises, and therefore what an alert is about. */
export type SmokeService = "speaking" | "writing";

/** What a check belongs to, so the report groups and the alert names it. */
export type SmokeGroup =
  | "speaking_part1"
  | "speaking_part2"
  | "speaking_part3"
  | "writing_task1"
  | "writing_task2";

type Common = {
  /** Stable, human-readable id. Appears in the report and in the log line. */
  id: string;
  label: string;
  group: SmokeGroup;
  /** Provenance only — the row this answer and its question were taken from. */
  source: { questionId: string; setId: string };
};

export type SpeakingFixture = Common & {
  service: "speaking";
  part: SpeakingPart;
  /** What was asked. For Part 2 this is the cue-card topic line. */
  question: string;
  /** Part 2 "You should say" bullets; the API scores coverage of them. */
  cueCardPoints?: string[];
  /** `s3://bucket/key`, the same form `user_responses.audio_url` holds. */
  audioUrl: string;
  durationSec: number;
};

export type WritingFixture = Common & {
  service: "writing";
  taskType: WritingTaskType;
  module: string;
  questionPrompt: string;
  wordMin: number;
  text: string;
};

export type SmokeFixture = SpeakingFixture | WritingFixture;

/** Where every recording below lives — one candidate's practice folder. */
const AUDIO = (file: string) =>
  `s3://ielts-ace-files/ielts-audio/9ed32e5f-161c-4454-a724-4996725e4912/${file}.wav`;

/* ------------------------------------------------------------------ *
 * Speaking — Cambridge 11 Test 1 (Part 1), Cambridge 11 Test 1 (Part 2),
 * Cambridge 16 Test 3 (Part 3).
 * ------------------------------------------------------------------ */

const SPEAKING: SpeakingFixture[] = [
  {
    id: "sp1-food-tv",
    label: "Speaking Part 1 · Do you watch cookery programmes on TV?",
    group: "speaking_part1",
    service: "speaking",
    part: 1,
    question: "Do you watch cookery programmes on TV? [Why/Why not?]",
    audioUrl: AUDIO("6ee58d4c-c413-428c-a91c-21191f29b80c"),
    durationSec: 24,
    source: {
      questionId: "9f324c03-7742-4b3c-9a6c-5bbf3d9d407a",
      setId: "85e376ee-178e-441a-9dd7-af2a3f164c91",
    },
  },
  {
    id: "sp1-food-eating-out",
    label: "Speaking Part 1 · Eating out or eating at home?",
    group: "speaking_part1",
    service: "speaking",
    part: 1,
    question: "In general, do you prefer eating out or eating at home? [Why?]",
    audioUrl: AUDIO("9d1a5988-9e1a-454d-adf1-1e3b87155072"),
    durationSec: 21,
    source: {
      questionId: "bef9ec7d-fdb9-47a1-a9a9-32dfc535b868",
      setId: "85e376ee-178e-441a-9dd7-af2a3f164c91",
    },
  },
  {
    id: "sp1-food-cooking",
    label: "Speaking Part 1 · Who normally does the cooking in your home?",
    group: "speaking_part1",
    service: "speaking",
    part: 1,
    question: "Who normally does the cooking in your home? [Why/Why not?]",
    audioUrl: AUDIO("46bdd63f-8dcd-469e-a03c-679530db30f1"),
    durationSec: 21,
    source: {
      questionId: "c99565c3-c26a-4320-8d1f-33eb28c120fb",
      setId: "85e376ee-178e-441a-9dd7-af2a3f164c91",
    },
  },
  {
    id: "sp1-food-likes",
    label: "Speaking Part 1 · What sorts of food do you like eating most?",
    group: "speaking_part1",
    service: "speaking",
    part: 1,
    question: "What sorts of food do you like eating most? [Why?]",
    audioUrl: AUDIO("ef8c4fae-78cd-4941-8c71-586739882ac8"),
    durationSec: 16,
    source: {
      questionId: "40545bed-9c9e-4935-b28a-542cf5c9fc7c",
      setId: "85e376ee-178e-441a-9dd7-af2a3f164c91",
    },
  },
  {
    // The only two-minute answer in the set, and the one that decides whether
    // the run fits inside maxDuration. Its bullets go over as `cue_card_points`,
    // exactly as scoring sends them, because coverage of them is part of the band.
    id: "sp2-house",
    label: "Speaking Part 2 · Describe a house/apartment that someone you know lives in",
    group: "speaking_part2",
    service: "speaking",
    part: 2,
    question: "Describe a house/apartment that someone you know lives in.",
    cueCardPoints: [
      "whose house/apartment this is",
      "where the house/apartment is",
      "what it looks like inside",
      "and explain what you like or dislike about this person's house/apartment.",
    ],
    audioUrl: AUDIO("0ba6076e-7764-4101-a9d6-bbc5388f7624"),
    durationSec: 120,
    source: {
      questionId: "91ede855-02e9-4cb7-ab6a-ca6178d39c9a",
      setId: "ef84d82a-51e9-4931-9553-9ece970d4c8b",
    },
  },
  {
    id: "sp3-rich-difficult",
    label: "Speaking Part 3 · How difficult is it to become very rich today?",
    group: "speaking_part3",
    service: "speaking",
    part: 3,
    question: "How difficult is it to become very rich in today's world?",
    audioUrl: AUDIO("64392b0e-102e-4ad2-a73c-7d1aa63e9f15"),
    durationSec: 30,
    source: {
      questionId: "19792a13-81e4-4b63-9dab-0049e918992a",
      setId: "cbd87ada-0674-4069-9b7a-224b220df0a7",
    },
  },
  {
    id: "sp3-young-buy",
    label: "Speaking Part 3 · Which expensive items would young people like to buy?",
    group: "speaking_part3",
    service: "speaking",
    part: 3,
    question: "Which expensive items would many young people (in your country) like to buy?",
    audioUrl: AUDIO("5351e8fe-ab0a-4614-a502-4858e95a1368"),
    durationSec: 27,
    source: {
      questionId: "4af2b6bf-f858-4d2a-92ba-0357269dfb6d",
      setId: "cbd87ada-0674-4069-9b7a-224b220df0a7",
    },
  },
  {
    id: "sp3-friends-or-selves",
    label: "Speaking Part 3 · Expensive items for friends or for themselves?",
    group: "speaking_part3",
    service: "speaking",
    part: 3,
    question:
      "Do you think that people are more likely to buy expensive items for their friends or for themselves?",
    audioUrl: AUDIO("ec89210e-7ee8-435d-8cd8-90801731c49a"),
    durationSec: 44,
    source: {
      questionId: "ab09cc40-4701-48f1-9bed-6def3f8ae6b7",
      setId: "cbd87ada-0674-4069-9b7a-224b220df0a7",
    },
  },
  {
    id: "sp3-young-vs-old",
    label: "Speaking Part 3 · How do younger and older people's purchases differ?",
    group: "speaking_part3",
    service: "speaking",
    part: 3,
    question:
      "How do the expensive items that younger people want to buy differ from those that older people want to buy?",
    audioUrl: AUDIO("8717bcd2-264a-49a3-a3d9-5d530ceff09f"),
    durationSec: 47,
    source: {
      questionId: "ea8ab241-1967-4366-9d94-c306d2655f8b",
      setId: "cbd87ada-0674-4069-9b7a-224b220df0a7",
    },
  },
];

/* ------------------------------------------------------------------ *
 * Writing — Cambridge 17 Test 2 Task 1, Cambridge 12 Test 2 Task 2.
 * Both answers are reproduced with the candidate's own spelling and slips
 * intact ("youngb", "diffulties"): they are what the grader has to mark, and
 * cleaning them up would quietly change the band this asserts against.
 * ------------------------------------------------------------------ */

const WRITING: WritingFixture[] = [
  {
    id: "wt1-police-budget",
    label: "Writing Task 1 · Police budget table and pie charts",
    group: "writing_task1",
    service: "writing",
    taskType: "writing_task1_academic",
    module: "academic",
    wordMin: 150,
    questionPrompt:
      "The table and charts below give information on the police budget for 2017 and 2018 in one area of Britain. The table shows where the money came from and the charts show how it was distributed.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    text: `The given table presents information about the budget of police in the year 2017 and 2018 in a region of the UK, whereas the pie charts illustrate   how much money was spent on salaries, technology, buildings and transport.

The most significant feature is that the highest amount of money came from the national government. However, the maximum funds was spent on the salaries of officers and staff.

According to the table, the national government contributed 175.5 million dollars to the police budget in 2017. But this number increased to 177.8 million dollars in 2018. The funds received through local taxes rose from 91.2 million dollars to 102.3 million dollars. Other sources such as grants made smaller contribution, which was 38 million dollars in 2017 and 38.5 million dollars in 2018.

Looking at the pie charts, the expenditure on salaries was 75% of total budget in 2017. But in 2018, it dropped to 69 percent. Moreover, the money spent on buildings and transport was same at 17% in both the years. Furthermore, the least amount of money was incurred on technology, and it was 8% in 2017 and 14% in 2018.

By and large, the national government was the main source of budget, and the salaries took up most of the expenses.`,
    source: {
      questionId: "ad5fed79-e616-4146-a835-24a4741cfd03",
      setId: "6d8d92d5-67f4-4c98-be60-6d3032bb4762",
    },
  },
  {
    id: "wt2-young-population",
    label: "Writing Task 2 · Large number of young adults — advantages/disadvantages",
    group: "writing_task2",
    service: "writing",
    taskType: "writing_task2",
    module: "academic",
    wordMin: 250,
    questionPrompt:
      "At the present time, the population of some countries includes a relatively large number of young adults, compared with the number of older people. Do the advantages of this situation outweigh the disadvantages?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.",
    text: `In recent times, some countries have a large number of young adults than older people. This situation can bring several benefits to country, although it may create some problems. In my opinion the advantages of having young population outweigh the disadvantages.

One major advantages is that young people can contribute significantly to the economy. Most young adults are able to work and can fill different jobs in area such as health care, education, technology and manufacturing. As a result, they can increase productivity and contribute to government income through taxes. For example, countries with a large working-age population may experience faster economic growth because more people are actively involved in workforce. Another benefit is youngb adults are generally more willing to learn new skills and use modern technology. They can adapt to changes in the workplace more easily and may create new businesses ans innovative ideas. Furthermore, a young population can support the development of society because young people have the energy and motivation to participate in different social and community activities.

However, having a large young population can also cause some diffulties. One important problem is unemployment. If the government cannot create enough jobs, many young people can lead to financial problems and social issues. In addition, government need to spend more money on education, training, healthcare and housing to meet the needs of growing young population.

In conclusion, although a high proportion of young adults can create challenges, particularly related to employment and public services. I believe that the advantages are greater. A young population can provide a strong workforce, support economic growth and encourage innovation.`,
    source: {
      questionId: "67598da6-6df7-41dd-b2a2-09b48b0f74e6",
      setId: "a0aed9d3-ec7a-4daa-ac1d-a0ca7ca668c7",
    },
  },
];

/**
 * Everything the probe submits, in the order the report reads best: the three
 * speaking parts in order, then the two writing tasks.
 */
export const SMOKE_FIXTURES: SmokeFixture[] = [...SPEAKING, ...WRITING];
