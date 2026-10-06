import type { Question } from '../types';

// Codility-style tasks. Each carries a reference solution and its hidden cases; the
// statement is ours, written in the Codility style, never their text. Performance inputs are
// built by `gen` from the case's own seeded draw (lib/grade.ts), so a failing case fails
// the same way on every Submit, and the data file stays small.
//
// Each answer is the live-pairing talk-track — brute force first, then the optimal with its
// complexity, then the edge cases — inside the live-coding round's 180s spoken budget.

const N = 100_000;
const int = (rng: () => number, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const ints = (rng: () => number, n: number, lo: number, hi: number) => Array.from({ length: n }, () => int(rng, lo, hi));
const range = (n: number, from = 0) => Array.from({ length: n }, (_, i) => i + from);
function shuffle<T>(xs: T[], rng: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
  return xs;
}
const starter = (params: string, returns: string, value: string) =>
  `function solution(${params}): ${returns} {\n  // Your solution here.\n  return ${value};\n}`;

export const algo: Question[] = [
  // ── Arrays & hashing ─────────────────────────────────────────────────────────────
  {
    id: 'algo-001',
    round: 'algo',
    category: 'Arrays & hashing',
    scratch: true,
    question: 'Find the value that occurs an odd number of times.',
    statement: `An array A of N integers is given. Every value in A occurs an even number of times except one, which occurs an odd number of times. Return that value.

Example:
  A = [9, 3, 9, 3, 9, 7, 9]  →  7

Constraints:
  N is an odd integer in [1..100,000]
  each element of A is an integer in [1..1,000,000,000]
  exactly one value occurs an odd number of times`,
    code: starter('A: number[]', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (A: number[]) => A.reduce((x, v) => x ^ v, 0),
      cases: [
        { name: 'example', kind: 'example', args: [[9, 3, 9, 3, 9, 7, 9]], expected: 7 },
        { name: 'single element', kind: 'correctness', args: [[42]], expected: 42 },
        { name: 'odd value first', kind: 'correctness', args: [[5, 1, 1]], expected: 5 },
        { name: 'odd value last', kind: 'correctness', args: [[1, 1, 5]], expected: 5 },
        { name: 'odd value occurs three times', kind: 'correctness', args: [[2, 2, 2, 4, 4]], expected: 2 },
        { name: 'values near 10^9', kind: 'correctness', args: [[1e9, 999_999_999, 1e9]], expected: 999_999_999 },
        { name: 'random, N = 99,999', kind: 'performance', gen: (rng) => { const half = ints(rng, 49_999, 1, 1e9); return [shuffle([...half, ...half, 777], rng)]; } },
        { name: 'one repeated value, N = 99,999', kind: 'performance', gen: () => [[...Array<number>(99_998).fill(3), 8]] },
      ],
    },
    answer: [
      'Pin the constraints first: N up to 100,000 rules out anything quadratic, and "odd number of times" means the answer can appear three or five times, not just once.',
      'Brute force counts every value against every other: O(N²), and it fails the performance tests. A Map of counts, then the key whose count is odd, is O(N) time and O(N) space.',
      'Optimal: XOR everything. x ^ x is 0 and XOR is commutative, so every even-count value cancels and the odd-count one is what is left: O(N) time, O(1) space. Values stay under 2^31, so JavaScript\'s 32-bit XOR is safe.',
      'Before submitting I would run a single element, the odd value at either end, and the odd value occurring three times.',
    ],
    keyPoints: [
      'Rules out O(N²) from N = 100,000 before writing code',
      'Names the Map-count solution: O(N) time, O(N) space',
      'Reaches XOR for O(N) time, O(1) space and says why pairs cancel',
      'Tests a single element and a value occurring three times',
    ],
    followUps: ['What breaks in the XOR trick if values can exceed 2^31 in JavaScript?', 'Two values are unpaired instead of one — can you still do it in O(1) space?'],
  },
  {
    id: 'algo-002',
    round: 'algo',
    category: 'Arrays & hashing',
    scratch: true,
    question: 'Check whether an array is a permutation of 1..N.',
    statement: `An array A of N integers is given. A permutation is a sequence in which each number from 1 to N appears exactly once. Return 1 if A is a permutation, and 0 otherwise.

Example:
  A = [4, 1, 3, 2]  →  1
  A = [4, 1, 3]     →  0   (the value 2 is missing)

Constraints:
  N is an integer in [1..100,000]
  each element of A is an integer in [1..1,000,000,000]`,
    code: starter('A: number[]', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (A: number[]) => {
        const seen = new Uint8Array(A.length + 1);
        for (const v of A) {
          if (v < 1 || v > A.length || seen[v]) return 0;
          seen[v] = 1;
        }
        return 1;
      },
      cases: [
        { name: 'example: permutation', kind: 'example', args: [[4, 1, 3, 2]], expected: 1 },
        { name: 'example: missing 2', kind: 'example', args: [[4, 1, 3]], expected: 0 },
        { name: 'single 1', kind: 'correctness', args: [[1]], expected: 1 },
        { name: 'single 2', kind: 'correctness', args: [[2]], expected: 0 },
        { name: 'duplicate', kind: 'correctness', args: [[1, 1]], expected: 0 },
        { name: 'value above N', kind: 'correctness', args: [[1, 3]], expected: 0 },
        { name: 'huge value', kind: 'correctness', args: [[1e9]], expected: 0 },
        { name: 'shuffled 1..N', kind: 'performance', limitMs: 500, gen: (rng) => [shuffle(range(N, 1), rng)] },
        { name: 'shuffled 1..N with one duplicate', kind: 'performance', limitMs: 500, gen: (rng) => { const xs = shuffle(range(N, 1), rng); xs[0] = xs[1]!; return [xs]; } },
      ],
    },
    answer: [
      'Restating the task: exactly the values 1 to N, each once, in any order. N is up to 100,000, so quadratic work is out, and the values go up to a billion, so I cannot index a table by value without checking the bound first.',
      'Brute force asks, for each number from 1 to N, whether A includes it. That is O(N²). Sorting and comparing against 1, 2, 3 and so on is O(N log N) and fine, but there is better.',
      'Optimal: a seen array of size N + 1. Walk A once; if a value is below 1, above N or already seen, return 0 on the spot, otherwise mark it. N values in range with no repeats must cover 1 to N exactly, so reaching the end means 1. That is O(N) time and O(N) space.',
      'The traps are duplicates and values above N, so I would test [1, 1], [1, 3], a single 2 and a single huge value, plus a single 1 as the smallest valid case.',
    ],
    keyPoints: [
      'Rules out O(N²) from N = 100,000 and names the O(N log N) sort-and-compare option',
      'Reaches a seen array: O(N) time, O(N) space, with early exit',
      'Checks the value is within 1..N before using it as an index',
      'Tests duplicates, a value above N, and the single-element cases',
    ],
    followUps: ['Can you do it in O(1) extra space by marking values in place?', 'What changes if A is not allowed to be modified?'],
  },
  {
    id: 'algo-003',
    round: 'algo',
    category: 'Arrays & hashing',
    scratch: true,
    question: 'Find the smallest positive integer missing from an array.',
    statement: `An array A of N integers is given. Return the smallest positive integer (greater than 0) that does not occur in A.

Example:
  A = [1, 3, 6, 4, 1, 2]  →  5
  A = [1, 2, 3]           →  4
  A = [-1, -3]            →  1

Constraints:
  N is an integer in [1..100,000]
  each element of A is an integer in [-1,000,000..1,000,000]`,
    code: starter('A: number[]', 'number', '1'),
    grader: {
      fn: 'solution',
      reference: (A: number[]) => {
        const seen = new Uint8Array(A.length + 2);
        for (const v of A) if (v > 0 && v <= A.length + 1) seen[v] = 1;
        let i = 1;
        while (seen[i]) i++;
        return i;
      },
      cases: [
        { name: 'example', kind: 'example', args: [[1, 3, 6, 4, 1, 2]], expected: 5 },
        { name: 'example: consecutive', kind: 'example', args: [[1, 2, 3]], expected: 4 },
        { name: 'all negative', kind: 'correctness', args: [[-1, -3]], expected: 1 },
        { name: 'single 2', kind: 'correctness', args: [[2]], expected: 1 },
        { name: 'single 1', kind: 'correctness', args: [[1]], expected: 2 },
        { name: 'only extremes', kind: 'correctness', args: [[-1e6, 1e6]], expected: 1 },
        { name: 'duplicates', kind: 'correctness', args: [[2, 2, 1, 1]], expected: 3 },
        { name: 'shuffled 1..N', kind: 'performance', gen: (rng) => [shuffle(range(N, 1), rng)] },
        { name: 'random in range', kind: 'performance', gen: (rng) => [ints(rng, N, -1e6, 1e6)] },
      ],
    },
    answer: [
      'Restating: the smallest value above zero that is not in A. Negatives and zero are noise, duplicates are allowed, and N is up to 100,000, so I want linear or near-linear work.',
      'The key observation is that the answer is always between 1 and N + 1: N distinct positives can fill 1 to N, and then the answer is N + 1, otherwise some gap comes first. That bounds how much I need to track.',
      'Brute force tries 1, 2, 3 and so on, calling includes on each, which is O(N²) on a permutation. Sorting and scanning for the first gap is O(N log N). Better: a seen array of size N + 2, mark every value between 1 and N + 1, then walk up from 1 to the first unmarked slot. O(N) time, O(N) space.',
      'Edge cases I would run: all negatives, a single 1, a single 2, duplicates such as [2, 2, 1, 1], and extreme values that must be ignored rather than indexed.',
    ],
    keyPoints: [
      'States the answer lies in 1..N + 1 and uses it to bound the table',
      'Rules out the includes-in-a-loop approach as O(N²)',
      'Reaches a seen array or Set: O(N) time, O(N) space, with sorting as the O(N log N) fallback',
      'Ignores negatives, zero and out-of-range values; tests all-negative and single-element inputs',
    ],
    followUps: ['Can you get O(1) extra space by placing each value at its own index?', 'What if the numbers arrive as a stream and cannot be stored?'],
  },

  // ── Prefix sums ──────────────────────────────────────────────────────────────────
  {
    id: 'algo-004',
    round: 'algo',
    category: 'Prefix sums',
    scratch: true,
    question: 'Count the pairs of cars passing each other.',
    statement: `Cars drive along a straight road, listed in order of position in an array A of N integers. A[i] is 0 if car i travels east and 1 if it travels west. Two cars pass each other when an eastbound car is listed before a westbound one: the pair (P, Q) counts when P < Q, A[P] = 0 and A[Q] = 1.

Return the number of passing pairs. If it is greater than 1,000,000,000, return -1.

Example:
  A = [0, 1, 0, 1, 1]  →  5   (pairs (0,1), (0,3), (0,4), (2,3), (2,4))

Constraints:
  N is an integer in [1..100,000]
  each element of A is 0 or 1`,
    code: starter('A: number[]', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (A: number[]) => {
        let east = 0, pairs = 0;
        for (const v of A) {
          if (v === 0) east++;
          else if ((pairs += east) > 1e9) return -1;
        }
        return pairs;
      },
      cases: [
        { name: 'example', kind: 'example', args: [[0, 1, 0, 1, 1]], expected: 5 },
        { name: 'single car', kind: 'correctness', args: [[0]], expected: 0 },
        { name: 'all west', kind: 'correctness', args: [[1, 1, 1]], expected: 0 },
        { name: 'all east', kind: 'correctness', args: [[0, 0, 0]], expected: 0 },
        { name: 'west then east', kind: 'correctness', args: [[1, 0]], expected: 0 },
        { name: 'east then west', kind: 'correctness', args: [[0, 1]], expected: 1 },
        { name: 'random', kind: 'performance', gen: (rng) => [ints(rng, N, 0, 1)] },
        { name: 'alternating, over 10^9 pairs', kind: 'performance', gen: () => [range(N).map((i) => i % 2)] },
        { name: 'just under the cap', kind: 'performance', gen: () => [[...Array<number>(10_000).fill(0), ...Array<number>(90_000).fill(1)]] },
      ],
    },
    answer: [
      'Restating: count pairs where an eastbound car comes before a westbound one. N is up to 100,000, so the answer can be around 2.5 billion, which is why the task caps it and asks for -1.',
      'Brute force is a double loop over every P < Q: O(N²), about 5 billion checks at the limit, which fails the performance tests.',
      'Optimal: a prefix count. Walk left to right keeping how many eastbound cars I have seen so far. Each westbound car forms a pair with every one of them, so I add the running count to the total. That is O(N) time and O(1) space. It is a prefix sum of the zeros, read at each one.',
      'The overflow guard matters: alternating input gives 1.25 billion pairs, over the limit, so I check after each addition and return -1 straight away. JavaScript doubles hold the sum exactly, so the trap is the rule, not the arithmetic.',
      'Tests: a single car, all east, all west, west then east giving 0, east then west giving 1, and the alternating array at full size.',
    ],
    keyPoints: [
      'Names the O(N²) double loop and why it fails at N = 100,000',
      'Reaches a running count of eastbound cars: O(N) time, O(1) space',
      'Applies the -1 guard when the total passes 10^9, and shows alternating input hits it',
      'Tests the order-sensitive pairs [1, 0] and [0, 1] and single-direction arrays',
    ],
    followUps: ['Count the same pairs by scanning from the right instead — what do you keep?', 'What if each car had a speed and cars could pass in both directions?'],
  },
  {
    id: 'algo-005',
    round: 'algo',
    category: 'Prefix sums',
    scratch: true,
    question: 'Answer minimum-impact queries over a DNA string.',
    statement: `A DNA string S of N characters is given, each one of A, C, G or T. The nucleotides have impact factors A = 1, C = 2, G = 3 and T = 4.

You are also given two arrays, P and Q, of M integers each. Query k asks for the minimum impact factor among the characters of S from index P[k] to index Q[k], both ends included. Return an array of M integers holding the answers in order.

Example:
  S = "CAGCCTA", P = [2, 5, 0], Q = [4, 5, 6]  →  [2, 4, 1]
    S[2..4] = "GCC" has minimum 2, S[5..5] = "T" has 4, S[0..6] contains an A.

Constraints:
  N is an integer in [1..100,000]
  M is an integer in [1..50,000]
  S consists only of the characters A, C, G and T
  0 ≤ P[k] ≤ Q[k] < N`,
    code: starter('S: string, P: number[], Q: number[]', 'number[]', '[]'),
    grader: {
      fn: 'solution',
      reference: (S: string, P: number[], Q: number[]) => {
        const n = S.length;
        const counts = ['A', 'C', 'G'].map((ch) => {
          const c = new Int32Array(n + 1);
          for (let i = 0; i < n; i++) c[i + 1] = c[i]! + (S[i] === ch ? 1 : 0);
          return c;
        });
        return P.map((p, k) => {
          const q = Q[k]!;
          const t = counts.findIndex((c) => c[q + 1]! - c[p]! > 0);
          return t === -1 ? 4 : t + 1;
        });
      },
      cases: [
        { name: 'example', kind: 'example', args: ['CAGCCTA', [2, 5, 0], [4, 5, 6]], expected: [2, 4, 1] },
        { name: 'single T', kind: 'correctness', args: ['T', [0], [0]], expected: [4] },
        { name: 'single A', kind: 'correctness', args: ['A', [0], [0]], expected: [1] },
        { name: 'all G', kind: 'correctness', args: ['GGGG', [0, 1], [3, 1]], expected: [3, 3] },
        { name: 'A only at the last index', kind: 'correctness', args: ['TTTA', [0, 3], [2, 3]], expected: [4, 1] },
        { name: 'random string, random ranges', kind: 'performance', gen: (rng) => {
          const S = Array.from({ length: N }, () => 'ACGT'[int(rng, 0, 3)]).join('');
          const P: number[] = [], Q: number[] = [];
          for (let k = 0; k < 50_000; k++) { const a = int(rng, 0, N - 1), b = int(rng, 0, N - 1); P.push(Math.min(a, b)); Q.push(Math.max(a, b)); }
          return [S, P, Q];
        } },
        { name: 'all T, every query the whole string', kind: 'performance', gen: () => ['T'.repeat(N), Array<number>(50_000).fill(0), Array<number>(50_000).fill(N - 1)] },
      ],
    },
    answer: [
      'Restating: many range-minimum queries over a four-letter alphabet, ends inclusive. N is 100,000 and M is 50,000, so the work has to be about N plus M, not N times M.',
      'Brute force scans each range: O(N·M), up to 5 billion steps. Early exit on finding an A does not save it, because an all-T string forces a full scan on every query.',
      'Optimal: prefix counts. For each of A, C and G, build an array where entry i + 1 is how many of that letter appear in the first i + 1 characters. A range holds a letter when the count at Q + 1 minus the count at P is positive. For each query I test A, then C, then G, and fall back to T, which needs no array of its own. Build is O(N), each query is O(1), so O(N + M) time and O(N) space.',
      'The trap is the inclusive range: the difference is count[Q + 1] minus count[P], not count[Q] minus count[P].',
      'Tests: a one-character string for A and for T, a query on a single index, an A only at the last index, and the all-T string at full size.',
    ],
    keyPoints: [
      'Computes brute force as O(N·M) and notes all-T defeats early exit',
      'Builds per-letter prefix counts: O(N + M) time, O(N) space',
      'Handles the inclusive end with count[Q + 1] - count[P]',
      'Explains why three arrays suffice, with T as the fallback',
    ],
    followUps: ['What if S can change between queries — which structure replaces the prefix arrays?', 'Why do you only need three prefix arrays and not four?'],
  },
  {
    id: 'algo-006',
    round: 'algo',
    category: 'Prefix sums',
    scratch: true,
    question: 'Find where the slice with the minimal average starts.',
    statement: `An array A of N integers is given. A slice (P, Q) with 0 ≤ P < Q < N is the elements A[P], A[P + 1], ..., A[Q]. Its average is the sum of those elements divided by Q − P + 1, so every slice has at least two elements.

Return the starting index P of a slice with the minimal average. If several slices share the minimal average, return the smallest starting index among them.

Example:
  A = [4, 2, 2, 5, 1, 5, 8]  →  1
    slice (1, 2) averages 2, slice (3, 4) averages 3, and slice (1, 4) averages 2.5, so the minimum is 2 and it starts at index 1.

Constraints:
  N is an integer in [2..100,000]
  each element of A is an integer in [-10,000..10,000]`,
    code: starter('A: number[]', 'number', '0'),
    grader: {
      fn: 'solution',
      // Only slices of length 2 and 3 matter: any longer slice splits into those without raising its minimum.
      reference: (A: number[]) => {
        let best = 0, bestAvg = Infinity;
        for (let i = 0; i + 1 < A.length; i++) {
          const two = (A[i]! + A[i + 1]!) / 2;
          if (two < bestAvg) { bestAvg = two; best = i; }
          if (i + 2 < A.length) {
            const three = (A[i]! + A[i + 1]! + A[i + 2]!) / 3;
            if (three < bestAvg) { bestAvg = three; best = i; }
          }
        }
        return best;
      },
      cases: [
        { name: 'example', kind: 'example', args: [[4, 2, 2, 5, 1, 5, 8]], expected: 1 },
        { name: 'two elements', kind: 'correctness', args: [[1, 2]], expected: 0 },
        { name: 'all equal', kind: 'correctness', args: [[5, 5, 5, 5]], expected: 0 },
        { name: 'all negative', kind: 'correctness', args: [[-3, -5, -8, -4, -10]] },
        { name: 'length-three slice wins', kind: 'correctness', args: [[10, 10, -10, 10, -10]] },
        { name: 'random', kind: 'performance', gen: (rng) => [ints(rng, N, -1e4, 1e4)] },
        { name: 'ascending', kind: 'performance', gen: () => [range(N).map((i) => -10_000 + Math.floor(i / 5))] },
      ],
    },
    answer: [
      'Restating: find the start of the lowest-average slice of two or more elements, earliest start on a tie. N is 100,000, so I cannot look at every slice.',
      'Brute force with prefix sums gives each slice average in O(1), but there are O(N²) slices, so it still fails the performance tests.',
      'The insight: a minimal-average slice never needs to be longer than three. Any slice of four or more splits into pieces of length two and three. Its average is a weighted average of the pieces, so at least one piece averages no more than the whole. So I only compare every pair and every triple: O(N) time, O(1) space.',
      'Ties go to the earliest index. I scan left to right and replace the best only on a strictly smaller average. If a long slice ties the minimum, every piece must tie too, so its first piece starts at the same index and is found anyway. The comparisons are exact: sums are small integers, and two different fractions with denominators 2 or 3 differ by at least a sixth, far above double rounding.',
      'Tests: two elements, all equal, all negative, and a case where a length-three slice beats every pair.',
    ],
    keyPoints: [
      'Notes prefix sums give O(N²) over all slices, still too slow',
      'Reduces to slices of length 2 and 3 with the splitting argument: O(N) time, O(1) space',
      'Resolves ties to the earliest index with a strict less-than',
      'Tests a case where a length-three slice wins and an all-equal array',
    ],
    followUps: ['Prove the claim that a minimal-average slice never needs more than three elements.', 'Return the slice length as well as its start.'],
  },

  // ── Two pointers & sliding window ────────────────────────────────────────────────
  {
    id: 'algo-007',
    round: 'algo',
    category: 'Two pointers & sliding window',
    scratch: true,
    question: 'Count pairs in a sorted array whose sum is at most T.',
    statement: `A sorted (ascending) array A of N integers and an integer T are given. Count the pairs of indices (i, j) with i < j and A[i] + A[j] ≤ T.

Example:
  A = [1, 2, 3, 4, 5], T = 6  →  6
    the pairs are 1+2, 1+3, 1+4, 1+5, 2+3 and 2+4.

Constraints:
  N is an integer in [0..100,000]
  A is sorted in non-decreasing order
  each element of A is an integer in [-1,000,000,000..1,000,000,000]
  T is an integer in [-2,000,000,000..2,000,000,000]`,
    code: starter('A: number[], T: number', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (A: number[], T: number) => {
        let i = 0, j = A.length - 1, count = 0;
        while (i < j) {
          if (A[i]! + A[j]! <= T) { count += j - i; i++; }
          else j--;
        }
        return count;
      },
      cases: [
        { name: 'example', kind: 'example', args: [[1, 2, 3, 4, 5], 6], expected: 6 },
        { name: 'empty', kind: 'correctness', args: [[], 0], expected: 0 },
        { name: 'single', kind: 'correctness', args: [[5], 10], expected: 0 },
        { name: 'all pairs fit', kind: 'correctness', args: [[1, 1, 1], 2], expected: 3 },
        { name: 'no pair fits', kind: 'correctness', args: [[1, 2, 3], 0], expected: 0 },
        { name: 'negatives', kind: 'correctness', args: [[-5, -1, 0, 3], -2], expected: 3 },
        { name: 'random sorted', kind: 'performance', gen: (rng) => [ints(rng, N, -1e9, 1e9).sort((a, b) => a - b), int(rng, -1e9, 1e9)] },
        { name: 'every pair fits', kind: 'performance', gen: () => [range(N), 2 * N] },
      ],
    },
    answer: [
      'Restating: count index pairs, not values, with sum at most T, in an array that is already sorted. N is 100,000, so there are about 5 billion pairs and I cannot visit each one.',
      'Brute force is the double loop: O(N²). Better: for each i, binary search for the last j that still fits, which is O(N log N) and acceptable, but the sort order allows linear.',
      'Optimal: two pointers, i at the start and j at the end. If A[i] + A[j] fits, then every index between i and j also pairs with i, because those values are no larger than A[j]. That is j minus i pairs in one step; add them and move i up. If it does not fit, A[j] is too big for every remaining i, so move j down. Each pointer moves at most N times: O(N) time, O(1) space.',
      'The count can reach about 5 billion, past 32 bits but exact in a JavaScript double, so a plain number is fine.',
      'Tests: an empty array, one element, all pairs fitting, none fitting, and negatives with a negative T.',
    ],
    keyPoints: [
      'Rules out the O(N²) double loop and names binary search at O(N log N)',
      'Reaches two pointers: O(N) time, O(1) space',
      'Explains why a fit at (i, j) adds j - i pairs at once',
      'Notes the count exceeds 32 bits but stays exact in a double; tests empty and negative inputs',
    ],
    followUps: ['Count pairs whose sum is exactly T when the array has duplicates.', 'How would you solve it if the array were not sorted?'],
  },
  {
    id: 'algo-008',
    round: 'algo',
    category: 'Two pointers & sliding window',
    scratch: true,
    question: 'Find the longest substring without a repeated character.',
    statement: `A string S of N characters is given. A substring is a run of consecutive characters of S. Return the length of the longest substring in which no character appears twice. An empty string has answer 0.

Example:
  S = "abcabcbb"  →  3   (the substring "abc")
  S = "aaaa"      →  1

Constraints:
  N is an integer in [0..100,000]
  S may contain any UTF-16 code units, not only lowercase letters`,
    code: starter('S: string', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (S: string) => {
        const last = new Map<string, number>();
        let start = 0, best = 0;
        for (let i = 0; i < S.length; i++) {
          const seen = last.get(S[i]!);
          if (seen !== undefined && seen >= start) start = seen + 1;
          last.set(S[i]!, i);
          best = Math.max(best, i - start + 1);
        }
        return best;
      },
      cases: [
        { name: 'example', kind: 'example', args: ['abcabcbb'], expected: 3 },
        { name: 'empty', kind: 'correctness', args: [''], expected: 0 },
        { name: 'one repeated letter', kind: 'correctness', args: ['aaaa'], expected: 1 },
        { name: 'repeat inside the window and before it', kind: 'correctness', args: ['abba'], expected: 2 },
        { name: 'answer in the middle', kind: 'correctness', args: ['pwwkew'], expected: 3 },
        { name: 'all distinct', kind: 'correctness', args: ['abcdef'], expected: 6 },
        { name: 'random letters', kind: 'performance', gen: (rng) => [Array.from({ length: N }, () => String.fromCharCode(97 + int(rng, 0, 25))).join('')] },
        { name: '20,000-character alphabet', kind: 'performance', gen: () => [Array.from({ length: N }, (_, i) => String.fromCharCode(0x4e00 + (i % 20_000))).join('')] },
      ],
    },
    answer: [
      'Restating: the longest run of consecutive characters with no repeats, and the alphabet is not limited to 26 letters. N is 100,000.',
      'Brute force restarts from every index and extends until it meets a repeat, using a Set. That is O(N times the window). With a wide alphabet the window reaches 20,000, so it is about 2 billion steps and fails.',
      'Optimal: a sliding window with a Map from character to the last index where I saw it. Keep a start index. At position i, if the character was last seen at or after start, move start to one past that index. Record the last index, and update the best with i minus start plus one. Each character is processed once: O(N) time, O(alphabet) space.',
      'The trap is the comparison with start. In "abba", when the final a arrives its last index is 0, which is already left of the window start of 2. If I moved start there unconditionally it would jump backwards and report 3 instead of 2. So start only ever moves forward.',
      'Tests: the empty string, one repeated letter, "abba", "pwwkew" where the best is in the middle, and all-distinct input.',
    ],
    keyPoints: [
      'Names the restart-from-every-index approach and why a wide alphabet makes it slow',
      'Slides a window with last-seen indexes: O(N) time, O(alphabet) space',
      'Explains the abba trap: start only moves forward',
      'Tests the empty string, a single repeated letter and an all-distinct string',
    ],
    followUps: ['Return the substring itself, not just its length.', 'Allow at most K distinct characters instead of none repeated — what changes?'],
  },
  {
    id: 'algo-009',
    round: 'algo',
    category: 'Two pointers & sliding window',
    scratch: true,
    question: 'Find the shortest subarray whose sum reaches S.',
    statement: `An array A of N positive integers and an integer S are given. Find the shortest contiguous subarray whose elements add up to at least S, and return its length. If no subarray reaches S, return 0.

Example:
  A = [2, 3, 1, 2, 4, 3], S = 7  →  2   (the subarray [4, 3])

Constraints:
  N is an integer in [0..100,000]
  each element of A is an integer in [1..10,000]
  S is an integer in [1..1,000,000,000]`,
    code: starter('A: number[], S: number', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (A: number[], S: number) => {
        let lo = 0, sum = 0, best = Infinity;
        for (let hi = 0; hi < A.length; hi++) {
          sum += A[hi]!;
          while (sum >= S) { best = Math.min(best, hi - lo + 1); sum -= A[lo]!; lo++; }
        }
        return best === Infinity ? 0 : best;
      },
      cases: [
        { name: 'example', kind: 'example', args: [[2, 3, 1, 2, 4, 3], 7], expected: 2 },
        { name: 'empty', kind: 'correctness', args: [[], 1], expected: 0 },
        { name: 'never reaches S', kind: 'correctness', args: [[1, 1, 1], 10], expected: 0 },
        { name: 'single element exactly S', kind: 'correctness', args: [[5], 5], expected: 1 },
        { name: 'needs the whole array', kind: 'correctness', args: [[1, 2, 3], 6], expected: 3 },
        { name: 'one element alone suffices', kind: 'correctness', args: [[1, 4, 4], 4], expected: 1 },
        { name: 'wide window', kind: 'performance', gen: (rng) => [ints(rng, N, 1, 1000), 25_000_000] },
        { name: 'S above the total', kind: 'performance', gen: (rng) => [ints(rng, N, 1, 1e4), 1e9] },
      ],
    },
    answer: [
      'Restating: the shortest contiguous block with sum at least S, or 0 if none. The key word is positive: every element is at least 1, so adding to a block only raises its sum.',
      'Brute force starts at each index and extends until the sum reaches S. With a wide window that is O(N²); in the tests the window is tens of thousands long, so it times out.',
      'Optimal: a sliding window with a running sum. Extend the right end by one element each step. While the sum is at least S, record the length, subtract the left element and move the left end forward. Each index enters once and leaves once, so it is O(N) time and O(1) space.',
      'This depends on positivity. With negative values, shrinking the window could raise the sum, so the two-pointer argument breaks and you need prefix sums with a monotonic deque instead.',
      'Tests: an empty array, a total below S giving 0, a single element equal to S, a case that needs the whole array, and a case where one element alone suffices. The sums reach 10^9, which a double holds exactly.',
    ],
    keyPoints: [
      'Names the extend-from-every-start approach as O(N²) for wide windows',
      'Reaches the sliding window: O(N) time, O(1) space, each index enters and leaves once',
      'States that the technique needs positive values, and what replaces it otherwise',
      'Tests an empty array, an unreachable S and a single element equal to S',
    ],
    followUps: ['What if the values can be negative — how does a monotonic deque on prefix sums help?', 'Return the subarray itself, not only its length.'],
  },

  // ── Sorting ──────────────────────────────────────────────────────────────────────
  {
    id: 'algo-010',
    round: 'algo',
    category: 'Sorting',
    scratch: true,
    question: 'Count the distinct values in an array.',
    statement: `An array A of N integers is given. Return the number of distinct values in A.

Example:
  A = [2, 1, 1, 2, 3, 1]  →  3   (the values 1, 2 and 3)

Constraints:
  N is an integer in [0..100,000]
  each element of A is an integer in [-1,000,000..1,000,000]`,
    code: starter('A: number[]', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (A: number[]) => new Set(A).size,
      cases: [
        { name: 'example', kind: 'example', args: [[2, 1, 1, 2, 3, 1]], expected: 3 },
        { name: 'empty', kind: 'correctness', args: [[]], expected: 0 },
        { name: 'single', kind: 'correctness', args: [[7]], expected: 1 },
        { name: 'negatives', kind: 'correctness', args: [[-1, 1, -1]], expected: 2 },
        { name: 'all the same', kind: 'correctness', args: [[0, 0, 0]], expected: 1 },
        { name: 'random', kind: 'performance', limitMs: 500, gen: (rng) => [ints(rng, N, -1e6, 1e6)] },
        { name: 'all distinct', kind: 'performance', limitMs: 500, gen: (rng) => [shuffle(range(N), rng)] },
      ],
    },
    answer: [
      'Restating: how many different values A holds. N is up to 100,000 and N can be 0, so the empty array must return 0.',
      'Brute force checks each element against everything before it, with indexOf or a nested loop: O(N²), which fails when all values are distinct.',
      'Two good options. First, sort and count the places where a value differs from its predecessor: O(N log N) time and O(1) extra space if I may sort in place, or O(N) if I copy. Second, a Set: add every element and return its size, O(N) time and O(N) space. I would name that trade-off aloud: the Set is faster, the sort uses less memory.',
      'One JavaScript trap: sort without a comparator orders values as strings, so negatives and multi-digit numbers come out in the wrong order. Equal values still end up adjacent, but I always pass (a, b) => a - b so the order is correct.',
      'Tests: an empty array, one element, negatives, all values the same and all values distinct.',
    ],
    keyPoints: [
      'Rules out the indexOf-per-element O(N²) approach',
      'Gives the sort-and-count solution at O(N log N) and the Set at O(N) time, O(N) space',
      'States the time-versus-memory trade-off between them',
      'Tests empty, single and negative inputs, and notes a comparator-less sort() still groups equal values',
    ],
    followUps: ['Values go up to 10^12 in a stream with bounded memory — how would you estimate the distinct count?', 'Does sort() without a comparator break the distinct count — and what does it get wrong for negatives?'],
  },
  {
    id: 'algo-011',
    round: 'algo',
    category: 'Sorting',
    scratch: true,
    question: 'Find the maximal product of any three elements.',
    statement: `A non-empty array A of N integers is given. Choose three elements at different indexes and multiply them. Return the maximal product that any such triple can give.

Example:
  A = [-3, 1, 2, -2, 5, 6]  →  60   (2 * 5 * 6)

Constraints:
  N is an integer in [3..100,000]
  each element of A is an integer in [-1,000..1,000]`,
    code: starter('A: number[]', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (A: number[]) => {
        const s = [...A].sort((a, b) => a - b);
        const n = s.length;
        return Math.max(s[n - 1]! * s[n - 2]! * s[n - 3]!, s[0]! * s[1]! * s[n - 1]!);
      },
      cases: [
        { name: 'example', kind: 'example', args: [[-3, 1, 2, -2, 5, 6]], expected: 60 },
        { name: 'exactly three', kind: 'correctness', args: [[1, 2, 3]], expected: 6 },
        { name: 'all negative', kind: 'correctness', args: [[-5, -4, -3, -2]], expected: -24 },
        { name: 'two big negatives', kind: 'correctness', args: [[-10, -10, 1, 3, 2]], expected: 300 },
        { name: 'zeros', kind: 'correctness', args: [[0, 0, 0]], expected: 0 },
        { name: 'extremes', kind: 'correctness', args: [[-1000, -1000, 1000]], expected: 1e9 },
        { name: 'random', kind: 'performance', gen: (rng) => [ints(rng, N, -1000, 1000)] },
      ],
    },
    answer: [
      'Restating: the best product of three elements at distinct positions, with negatives allowed. N is 100,000, so I need to avoid looking at every triple.',
      'Brute force is three nested loops: O(N³), hopeless at this size. The trap with a greedy "take the three largest" is negatives: two large negatives multiply to a large positive.',
      'Optimal by sorting: after sorting ascending, the answer is either the product of the three largest, or the product of the two smallest, which may both be negative, times the largest. Take the maximum of those two. That is O(N log N) time. Sort a copy so I do not mutate the input, which costs O(N) space.',
      'If I want linear time, one pass tracks the three largest and two smallest values: O(N) time, O(1) space.',
      'Tests: exactly three elements, all negatives where the answer is the three closest to zero, two big negatives with small positives, zeros, and the extremes -1000, -1000, 1000, which gives 10^9, safe in a double.',
    ],
    keyPoints: [
      'Rules out O(N³) triples',
      'Sorts and compares top-three against bottom-two times top: O(N log N)',
      'Names the O(N) single pass tracking five values, O(1) space',
      'Tests all-negative, two-big-negatives, exactly-three and zero inputs',
    ],
    followUps: ['Do it in one pass without sorting.', 'Generalise to the maximal product of K elements.'],
  },
  {
    id: 'algo-012',
    round: 'algo',
    category: 'Sorting',
    scratch: true,
    question: 'Count intersecting pairs of discs.',
    statement: `N discs lie on a plane. Disc i has its centre at (i, 0) and radius A[i], where A is an array of N non-negative integers. Two discs intersect when they have at least one point in common, so touching counts.

Return the number of pairs of discs (i, j) with i < j that intersect. If that number is greater than 10,000,000, return -1.

Example:
  A = [1, 5, 2, 1, 4, 0]  →  11

Constraints:
  N is an integer in [0..100,000]
  each element of A is an integer in [0..2,147,483,647]`,
    code: starter('A: number[]', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (A: number[]) => {
        const n = A.length;
        const starts = A.map((r, i) => i - r).sort((a, b) => a - b);
        const ends = A.map((r, i) => i + r).sort((a, b) => a - b);
        let count = 0, j = 0;
        for (let i = 0; i < n; i++) {
          while (j < n && starts[j]! <= ends[i]!) j++;
          count += j - i - 1;
          if (count > 1e7) return -1;
        }
        return count;
      },
      cases: [
        { name: 'example', kind: 'example', args: [[1, 5, 2, 1, 4, 0]], expected: 11 },
        { name: 'empty', kind: 'correctness', args: [[]], expected: 0 },
        { name: 'single disc', kind: 'correctness', args: [[0]], expected: 0 },
        { name: 'points only', kind: 'correctness', args: [[0, 0, 0]], expected: 0 },
        { name: 'overlapping neighbours', kind: 'correctness', args: [[1, 1]], expected: 1 },
        { name: 'touching at a point', kind: 'correctness', args: [[1, 0, 0]], expected: 1 },
        { name: 'radii past 32-bit sums', kind: 'correctness', args: [[2147483647, 0, 2147483647]], expected: 3 },
        { name: 'small radii', kind: 'performance', gen: (rng) => [ints(rng, N, 0, 10)] },
        { name: 'huge overlap', kind: 'performance', gen: () => [Array<number>(N).fill(1e6)] },
      ],
    },
    answer: [
      'Restating: discs centred on a line, so each disc is an interval from i minus A[i] to i plus A[i], and two discs intersect exactly when their intervals share a point, endpoints included. Return -1 above 10 million pairs.',
      'Brute force checks every pair: O(N²), about 5 billion checks at N = 100,000.',
      'Optimal: sort the starts and sort the ends, then sweep. Process discs in order of end. For disc i, count how many intervals start at or before its end. That is the pointer j into the sorted starts. Those include the discs that ended before this one, which I have already paired, and the disc itself. Of the j starts, i belong to earlier-ending discs and one is this disc, so it adds j minus i minus 1 new pairs. Sorting dominates: O(N log N) time, O(N) space. I return -1 as soon as the running count passes 10 million.',
      'Starts and ends such as i plus A[i] reach about 2.1 billion, past a 32-bit signed integer. JavaScript numbers are doubles so there is no overflow, but in C++ or Java I would use 64-bit.',
      'Tests: empty, a single disc, radius-zero points, two discs touching, and the huge radii.',
    ],
    keyPoints: [
      'Turns discs into intervals and rules out the O(N²) pair check',
      'Sorts starts and ends, then sweeps: O(N log N) time, O(N) space',
      'Explains the j - i - 1 term and the inclusive start <= end test',
      'Flags the 32-bit overflow trap for i + A[i] and the early -1 return',
    ],
    followUps: ['Why does each disc add j - i - 1 pairs and not j - i?', 'How would you count the discs that cover a given point?'],
  },
  // ── Stacks & queues ──────────────────────────────────────────────────────────────
  {
    id: 'algo-013',
    round: 'algo',
    category: 'Stacks & queues',
    scratch: true,
    question: 'Check whether a string of brackets is properly nested.',
    statement: `A string S of N characters is given, each one of ( ) [ ] { }. S is properly nested when every closing bracket matches the most recent opening bracket that is still unclosed, and all brackets get closed. The empty string is properly nested. Return 1 if S is properly nested, and 0 otherwise.

Example:
  S = "{[()()]}"  →  1
  S = "([)()]"    →  0   (the ) arrives while [ is the innermost open bracket)

Constraints:
  N is an integer in [0..200,000]
  S consists only of the characters ( ) [ ] { }`,
    code: starter('S: string', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (S: string) => {
        const open: string[] = [];
        const pair: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
        for (const c of S) {
          if (c in pair) { if (open.pop() !== pair[c]) return 0; }
          else open.push(c);
        }
        return open.length === 0 ? 1 : 0;
      },
      cases: [
        { name: 'example: nested', kind: 'example', args: ['{[()()]}'], expected: 1 },
        { name: 'example: crossed', kind: 'example', args: ['([)()]'], expected: 0 },
        { name: 'empty', kind: 'correctness', args: [''], expected: 1 },
        { name: 'single opener', kind: 'correctness', args: ['('], expected: 0 },
        { name: 'single closer', kind: 'correctness', args: [')'], expected: 0 },
        { name: 'wrong closer', kind: 'correctness', args: ['(]'], expected: 0 },
        { name: 'closer first', kind: 'correctness', args: ['}{'], expected: 0 },
        { name: 'siblings', kind: 'correctness', args: ['((()))[]{}'], expected: 1 },
        { name: 'deep nesting', kind: 'performance', gen: () => ['('.repeat(N) + ')'.repeat(N)] },
        { name: 'deep mixed nesting', kind: 'performance', gen: () => ['{[('.repeat(33_333) + ')]}'.repeat(33_333)] },
        { name: 'one closer short', kind: 'performance', gen: () => ['('.repeat(N) + ')'.repeat(N - 1)] },
      ],
    },
    answer: [
      'Restating: S holds only the six bracket characters, and properly nested means every closer matches the latest still-open opener of its own type, with nothing left open. The empty string counts as nested, and N reaches 200,000, so I want a single linear pass.',
      'Brute force repeatedly deletes adjacent "()", "[]" and "{}" pairs until nothing changes. Each sweep is O(N), and deep nesting such as "((((...))))" removes only one pair per sweep, so it needs about N/2 sweeps: O(N²).',
      'Optimal: a stack of openers. Push every opener. On a closer, pop and compare: if the stack was empty, or the popped opener is the wrong type, return 0. At the end return 1 only if the stack is empty. That is O(N) time and O(N) space, since a string of all openers fills the stack.',
      'The traps are a closer arriving on an empty stack, where pop gives undefined and the comparison must still fail, and openers left over at the end. Tests: empty, a lone opener, a lone closer, "(]", "}{", sibling groups, and 100,000-deep nesting.',
    ],
    keyPoints: [
      'Rules out repeated pair deletion as O(N²) on deep nesting',
      'Uses a stack of openers: O(N) time, O(N) space',
      'Handles a closer on an empty stack and openers left over at the end',
      'Tests empty, a lone opener or closer, a wrong-type closer and very deep nesting',
    ],
    followUps: ['Only one bracket type is allowed — can you do it in O(1) space?', 'Return the index of the first bracket that breaks the nesting instead of 0 or 1.'],
  },
  {
    id: 'algo-014',
    round: 'algo',
    category: 'Stacks & queues',
    scratch: true,
    question: 'Count the fish that stay alive.',
    statement: `N fish are lined up in a river. Fish i has a size A[i], and no two fish share a size. B[i] gives its direction: 0 means it swims upstream (towards index 0), 1 means it swims downstream (towards index N - 1). All fish swim at the same speed. When a downstream fish meets an upstream fish ahead of it, the bigger one eats the smaller and carries on in its own direction. Return the number of fish still alive once no more meetings can happen.

Example:
  A = [4, 3, 2, 1, 5]
  B = [0, 1, 0, 0, 0]  →  2   (the fish of size 3 eats those of size 2 and 1, then the 5 eats it; only 4 and 5 survive)

Constraints:
  N is an integer in [1..100,000]
  each element of A is a distinct integer in [0..1,000,000,000]
  each element of B is 0 or 1`,
    code: starter('A: number[], B: number[]', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (A: number[], B: number[]) => {
        const down: number[] = [];
        let survivors = 0;
        for (let i = 0; i < A.length; i++) {
          if (B[i] === 1) { down.push(A[i]!); continue; }
          while (down.length > 0 && down[down.length - 1]! < A[i]!) down.pop();
          if (down.length === 0) survivors++;
        }
        return survivors + down.length;
      },
      cases: [
        { name: 'example', kind: 'example', args: [[4, 3, 2, 1, 5], [0, 1, 0, 0, 0]], expected: 2 },
        { name: 'single fish', kind: 'correctness', args: [[5], [1]], expected: 1 },
        { name: 'all upstream', kind: 'correctness', args: [[1, 2, 3], [0, 0, 0]], expected: 3 },
        { name: 'all downstream', kind: 'correctness', args: [[1, 2, 3], [1, 1, 1]], expected: 3 },
        { name: 'upstream fish wins', kind: 'correctness', args: [[1, 2], [1, 0]], expected: 1 },
        { name: 'downstream fish wins', kind: 'correctness', args: [[2, 1], [1, 0]], expected: 1 },
        { name: 'random', kind: 'performance', limitMs: 500, gen: (rng) => [shuffle(range(N), rng), ints(rng, N, 0, 1)] },
        { name: 'half downstream, then bigger upstream fish', kind: 'performance', limitMs: 500, gen: () => [range(N), range(N).map((i) => (i < N / 2 ? 1 : 0))] },
      ],
    },
    answer: [
      'Restating: only a downstream fish with an upstream fish directly ahead of it ever meets anything, the bigger one wins, and I count who is left. Sizes are distinct, so there are no ties, and N is 100,000.',
      'Brute force simulates the meetings: find an adjacent downstream-then-upstream pair, delete the smaller, repeat. Each deletion costs a rescan or an array splice, and there can be N of them: O(N²).',
      'Optimal: scan left to right with a stack of the sizes of downstream fish. A downstream fish is pushed. An upstream fish fights the stack top while the top is smaller, popping each fish it eats. If the stack is empty afterwards the upstream fish survives, otherwise the top fish ate it. The answer is the surviving upstream fish plus whatever remains on the stack. Each fish is pushed and popped at most once, so it is O(N) time and O(N) space.',
      'Tests: a single fish, everything upstream, everything downstream, and a two-fish pair in each order, then a large input where one upstream fish clears a long run of downstream fish.',
    ],
    keyPoints: [
      'Rules out simulating each meeting as O(N²)',
      'Uses a stack of downstream fish: O(N) time because each fish is pushed and popped at most once',
      'Counts upstream fish that clear the stack plus the fish left on it',
      'Tests a single fish, one direction only and both orders of a pair',
    ],
    followUps: ['What changes if two fish can have the same size?', 'Return the indexes of the surviving fish.'],
  },
  {
    id: 'algo-015',
    round: 'algo',
    category: 'Stacks & queues',
    scratch: true,
    question: 'Count the minimum number of rectangular blocks to build a wall.',
    statement: `A wall is built from N segments of unit width, left to right. H[i] is the height segment i must have. The wall is assembled from rectangular blocks of any whole-number width and height, and blocks may be stacked on top of one another. Every segment must end up exactly H[i] tall, with no gaps and nothing sticking out. Return the minimum number of blocks needed.

Example:
  H = [8, 8, 5, 7, 9, 8, 7, 4, 8]  →  7

Constraints:
  N is an integer in [1..100,000]
  each element of H is an integer in [1..1,000,000,000]`,
    code: starter('H: number[]', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (H: number[]) => {
        const stack: number[] = [];
        let blocks = 0;
        for (const h of H) {
          while (stack.length > 0 && stack[stack.length - 1]! > h) stack.pop();
          if (stack.length === 0 || stack[stack.length - 1]! < h) { stack.push(h); blocks++; }
        }
        return blocks;
      },
      cases: [
        { name: 'example', kind: 'example', args: [[8, 8, 5, 7, 9, 8, 7, 4, 8]], expected: 7 },
        { name: 'single segment', kind: 'correctness', args: [[5]], expected: 1 },
        { name: 'increasing', kind: 'correctness', args: [[1, 2, 3]], expected: 3 },
        { name: 'decreasing', kind: 'correctness', args: [[3, 2, 1]], expected: 3 },
        { name: 'flat', kind: 'correctness', args: [[2, 2, 2]], expected: 1 },
        { name: 'returning to an open height', kind: 'correctness', args: [[1, 2, 1, 2]], expected: 3 },
        { name: 'random', kind: 'performance', gen: (rng) => [ints(rng, N, 1, 1e9)] },
        { name: 'sawtooth', kind: 'performance', gen: () => [range(N).map((i) => (i % 1000) + 1)] },
        { name: 'staircase', kind: 'performance', gen: () => [range(N, 1)] },
      ],
    },
    answer: [
      'Restating: build a skyline of exact heights from rectangles that can be stacked, using as few as possible. Heights go up to a billion, so I care about the order of heights, not their size, and N is 100,000.',
      'Brute force is recursive: lay one block at the minimum height across the whole range, then recurse on each part above it. Finding the minimum each time makes it O(N²), and on a staircase the recursion goes N levels deep, which can overflow the call stack.',
      'Optimal: scan left to right with a stack of heights that currently have an open block. For each height h, pop every taller height, since those blocks end here. If the top now equals h, the same block simply continues. Otherwise push h and count one new block. Each height is pushed and popped at most once: O(N) time, O(N) space.',
      'Tests: a single segment, strictly increasing, strictly decreasing, flat, and returning to a height that is still open, as in [1, 2, 1, 2], which needs 3 blocks and not 4.',
    ],
    keyPoints: [
      'Rules out recursive splitting at the minimum: O(N²) and N-deep recursion on a staircase',
      'Keeps a stack of open heights: O(N) time, O(N) space, since each height is pushed and popped at most once',
      'Pops taller heights, reuses an equal one, and counts a block only on a push',
      'Tests flat, increasing, decreasing and returning to a still-open height',
    ],
    followUps: ['Return the blocks themselves, not just the count.', 'Why is it safe to reuse an equal height that is already open on the stack?'],
  },
  // ── Binary search ────────────────────────────────────────────────────────────────
  {
    id: 'algo-016',
    round: 'algo',
    category: 'Binary search',
    scratch: true,
    question: 'Answer lower-bound queries on a sorted array.',
    statement: `A sorted (ascending) array A of N integers and an array X of M queries are given. For each X[k], find the first index i with A[i] >= X[k]. If every element of A is smaller than X[k], the answer for that query is N. Return the array of M answers.

Example:
  A = [1, 3, 3, 5, 8]
  X = [3, 4, 0, 9]  →  [1, 3, 0, 5]

Constraints:
  N is an integer in [0..100,000]
  M is an integer in [1..100,000]
  A is sorted in ascending order (duplicates are allowed)
  each element of A and X is an integer in [-1,000,000,000..1,000,000,000]`,
    code: starter('A: number[], X: number[]', 'number[]', '[]'),
    grader: {
      fn: 'solution',
      reference: (A: number[], X: number[]) =>
        X.map((x) => {
          let lo = 0, hi = A.length;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (A[mid]! < x) lo = mid + 1;
            else hi = mid;
          }
          return lo;
        }),
      cases: [
        { name: 'example', kind: 'example', args: [[1, 3, 3, 5, 8], [3, 4, 0, 9]], expected: [1, 3, 0, 5] },
        { name: 'empty array', kind: 'correctness', args: [[], [5]], expected: [0] },
        { name: 'equal to the only element', kind: 'correctness', args: [[2], [2]], expected: [0] },
        { name: 'above the only element', kind: 'correctness', args: [[2], [3]], expected: [1] },
        { name: 'first of the duplicates', kind: 'correctness', args: [[1, 1, 1], [1]], expected: [0] },
        { name: 'negatives', kind: 'correctness', args: [[-5, -3, 0], [-4, -10, 1]], expected: [1, 0, 3] },
        { name: 'random', kind: 'performance', gen: (rng) => [ints(rng, N, -1e9, 1e9).sort((a, b) => a - b), ints(rng, N, -1e9, 1e9)] },
        { name: 'every query past the end', kind: 'performance', gen: () => [range(N), Array<number>(N).fill(N)] },
      ],
    },
    answer: [
      'Restating: for each query, the first position whose value is at least the query, or N when nothing is. A is sorted, which is the hint, and with N and M both up to 100,000 a scan per query is too slow.',
      'Brute force walks A for every query: O(N·M), about 10^10 steps. Binary search per query is O(log N), so O(M log N) in total with O(1) extra space beyond the answer.',
      'The invariant: keep lo and hi so that the answer is always between them, inclusive. Start with lo = 0 and hi = N, not N - 1, because N itself is a legal answer. While lo < hi, take mid; if A[mid] < x the answer is right of mid, so lo = mid + 1, otherwise hi = mid. When the range closes, lo is the answer. Strict < gives the lower bound; <= would give the upper bound.',
      'On the midpoint, (lo + hi) >> 1 is fine here, but the sum would pass the 32-bit ceiling for arrays beyond about 2^30 elements. Tests: an empty array, a single element equal, below and above, duplicates, negatives, and queries past the end.',
    ],
    keyPoints: [
      'Rules out a linear scan per query: O(N·M), about 10^10',
      'Binary search per query: O(M log N) total',
      'Starts with hi = N and uses strict < so the first of the duplicates is returned',
      'Tests an empty array, duplicates, and queries below, inside and above the range',
    ],
    followUps: ['How do you get the upper bound, or the count of occurrences of x?', 'If the queries are also sorted, can two pointers answer them in O(N + M)?'],
  },
  {
    id: 'algo-017',
    round: 'algo',
    category: 'Binary search',
    scratch: true,
    question: 'Split an array into K blocks minimising the largest block sum.',
    statement: `An integer K and an array A of N non-negative integers are given. Split A into at most K contiguous blocks; blocks may be empty, and an empty block has sum 0. Every element belongs to exactly one block, and the blocks stay in the original order. Return the smallest possible value of the largest block sum.

Example:
  K = 3, A = [2, 1, 5, 1, 2, 2, 2]  →  6   (for instance [2, 1] [5, 1] [2, 2, 2])

Constraints:
  N and K are integers in [1..100,000]
  each element of A is an integer in [0..10,000]`,
    code: starter('K: number, A: number[]', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (K: number, A: number[]) => {
        const blocksFor = (cap: number) => {
          let blocks = 1, sum = 0;
          for (const v of A) {
            if (sum + v > cap) { blocks++; sum = v; }
            else sum += v;
          }
          return blocks;
        };
        let lo = A.reduce((m, v) => Math.max(m, v), 0), hi = A.reduce((s, v) => s + v, 0);
        while (lo < hi) {
          const mid = Math.floor((lo + hi) / 2);
          if (blocksFor(mid) <= K) hi = mid;
          else lo = mid + 1;
        }
        return lo;
      },
      cases: [
        { name: 'example', kind: 'example', args: [3, [2, 1, 5, 1, 2, 2, 2]], expected: 6 },
        { name: 'one block', kind: 'correctness', args: [1, [1, 2, 3]], expected: 6 },
        { name: 'more blocks than elements', kind: 'correctness', args: [5, [1, 2, 3]], expected: 3 },
        { name: 'all zeros', kind: 'correctness', args: [2, [0, 0, 0]], expected: 0 },
        { name: 'single max element', kind: 'correctness', args: [1, [10_000]], expected: 10_000 },
        { name: 'random, small K', kind: 'performance', gen: (rng) => [int(rng, 1, 100), ints(rng, N, 0, 1e4)] },
        { name: 'K = N', kind: 'performance', gen: (rng) => [N, ints(rng, N, 0, 1e4)] },
      ],
    },
    answer: [
      'Restating: cut A into at most K consecutive pieces so that the heaviest piece is as light as possible. N and K are 100,000 and the total sum can reach 10^9, so I cannot try every answer one by one, but I can search over them.',
      'Brute force or DP: best[k][i] is the best split of the first i elements into k blocks, trying every last split point. That is O(N²·K), far too slow. Trying every possible cap from max(A) upward is up to 10^9 checks.',
      'Optimal: binary search on the answer. The cap is at least max(A), since one block must hold the largest element, and at most sum(A), one block. For a given cap, a greedy check packs elements into the current block until the next would exceed the cap, then starts a new block, and counts blocks. This is O(N). The check is monotone: if a cap works, every larger cap works too, which is what makes binary search valid. Find the smallest cap that needs at most K blocks. Total O(N log sum), O(1) extra space.',
      'Tests: K = 1 gives the sum, K at least N gives the maximum, all zeros, and a single element. To find the maximum I use reduce, because Math.max(...A) spreads N arguments and can hit the engine limit.',
    ],
    keyPoints: [
      'Rules out DP over split points: O(N²·K)',
      'Binary searches the answer between max(A) and sum(A) with a greedy O(N) check: O(N log sum)',
      'Names the monotonicity: a cap that works means every larger cap works',
      'Tests K = 1, K at least N, all zeros and a single element',
    ],
    followUps: ['Return the split points as well as the minimal sum.', 'Why use reduce instead of Math.max(...A) for the lower bound?'],
  },
  {
    id: 'algo-018',
    round: 'algo',
    category: 'Binary search',
    scratch: true,
    question: 'Find the fewest nails that pin every plank.',
    statement: `N planks lie on a number line. Plank i covers every position from A[i] to B[i], endpoints included. M nails are hammered one after another: nail j goes into position C[j], in the order j = 0, 1, 2, ... A plank is pinned when at least one hammered nail sits inside its span. Return the smallest k such that the first k nails pin every plank, or -1 if even all M nails are not enough.

Example:
  A = [1, 4, 5, 8]
  B = [4, 5, 9, 10]
  C = [4, 6, 7, 10, 2]  →  4   (nails 4, 6, 7, 10 pin all four planks)

Constraints:
  N and M are integers in [1..100,000]
  each element of A, B and C is an integer in [1..200,000]
  A[i] <= B[i] for every i`,
    code: starter('A: number[], B: number[], C: number[]', 'number', '-1'),
    grader: {
      fn: 'solution',
      reference: (A: number[], B: number[], C: number[]) => {
        let max = 0;
        for (const xs of [A, B, C]) for (const v of xs) if (v > max) max = v;
        const allNailed = (k: number) => {
          const prefix = new Int32Array(max + 1);
          for (let j = 0; j < k; j++) prefix[C[j]!] = 1;
          for (let p = 1; p <= max; p++) prefix[p] = prefix[p]! + prefix[p - 1]!;
          return A.every((a, i) => prefix[B[i]!]! - prefix[a - 1]! > 0);
        };
        let lo = 1, hi = C.length, answer = -1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          if (allNailed(mid)) { answer = mid; hi = mid - 1; }
          else lo = mid + 1;
        }
        return answer;
      },
      cases: [
        { name: 'example', kind: 'example', args: [[1, 4, 5, 8], [4, 5, 9, 10], [4, 6, 7, 10, 2]], expected: 4 },
        { name: 'one plank, one nail', kind: 'correctness', args: [[1], [1], [1]], expected: 1 },
        { name: 'nail misses', kind: 'correctness', args: [[1], [1], [2]], expected: -1 },
        { name: 'nail on the endpoint', kind: 'correctness', args: [[2], [3], [3]], expected: 1 },
        { name: 'needs both nails', kind: 'correctness', args: [[1, 5], [2, 6], [5, 1]], expected: 2 },
        { name: 'random planks and nails', kind: 'performance', gen: (rng) => {
          const A = ints(rng, N, 1, 199_000);
          return [A, A.map((a) => Math.min(200_000, a + int(rng, 0, 1000))), ints(rng, N, 1, 200_000)];
        } },
        // The random case above has zero-width planks, so it almost always answers -1; wide planks make the search land inside the nail list.
        { name: 'wide planks', kind: 'performance', gen: (rng) => {
          const A = ints(rng, N, 1, 199_000);
          return [A, A.map((a) => Math.min(200_000, a + int(rng, 200, 1000))), ints(rng, N, 1, 200_000)];
        } },
        // Planks [i, i] and nails N..1: plank i is only pinned by nail N - i, so all N nails are needed and a per-plank scan of the nail list does about N²/2 steps.
        { name: 'each plank pinned only by a late nail', kind: 'performance', gen: () => [range(N, 1), range(N, 1), range(N, 1).reverse()] },
      ],
    },
    answer: [
      'Restating: the smallest prefix of the nail list that pins every plank, with endpoints inclusive, or -1. N and M are 100,000 and positions go up to 200,000.',
      'Brute force takes each plank and scans the nails for the earliest one inside it, then takes the largest of those: O(N·M), about 10^10 steps.',
      'Optimal: binary search on the nail count k. It is monotone, because adding a nail never un-pins a plank, so I look for the smallest k that works. To check one k, mark the first k nail positions in an array over positions, turn it into running counts, and a plank from a to b is pinned when prefix[b] minus prefix[a - 1] is above zero. A check costs O(N + k + P), where P is the largest position, 200,000, and there are log M checks: O((N + M + P) log M) time, O(P) space.',
      'The traps are the inclusive endpoints, prefix[a - 1] when a is 1, which reads the zero in slot 0 and so is safe, and using the nails in their given order, not sorted. Tests: one plank with a hit, a miss and an endpoint hit, and a case needing both nails.',
    ],
    keyPoints: [
      'Rules out scanning the nails per plank: O(N·M)',
      'Binary searches the nail count, valid because more nails never un-pin a plank',
      'Checks one count with a prefix-count array: O((N + M + P) log M) overall, P the largest position',
      'Handles inclusive endpoints, prefix[a - 1] and the -1 answer',
    ],
    followUps: ['Can you get O((N + M) log M) by finding the earliest nail inside each plank, using the nails sorted by position and a range-minimum structure over their indexes?', 'Return which planks stop a smaller answer from working.'],
  },
  // ── Greedy ───────────────────────────────────────────────────────────────────────
  {
    id: 'algo-019',
    round: 'algo',
    category: 'Greedy',
    scratch: true,
    question: 'Find the maximal profit from one buy and one later sell.',
    statement: `An array A of N integers is given, where A[i] is the price of a share on day i. You may buy on one day and sell on a strictly later day, once. Return the maximal profit you can make. If no trade makes a profit, or there are fewer than two days, return 0.

Example:
  A = [23171, 21011, 21123, 21366, 21013, 21367]  →  356   (buy at 21011, sell at 21367)

Constraints:
  N is an integer in [0..100,000]
  each element of A is an integer in [0..200,000]`,
    code: starter('A: number[]', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (A: number[]) => {
        let min = Infinity, best = 0;
        for (const p of A) { min = Math.min(min, p); best = Math.max(best, p - min); }
        return best;
      },
      cases: [
        { name: 'example', kind: 'example', args: [[23171, 21011, 21123, 21366, 21013, 21367]], expected: 356 },
        { name: 'empty', kind: 'correctness', args: [[]], expected: 0 },
        { name: 'single day', kind: 'correctness', args: [[5]], expected: 0 },
        { name: 'falling prices', kind: 'correctness', args: [[5, 4, 3]], expected: 0 },
        { name: 'two days up', kind: 'correctness', args: [[1, 2]], expected: 1 },
        { name: 'minimum after the maximum', kind: 'correctness', args: [[3, 8, 1, 4]], expected: 5 },
        { name: 'random', kind: 'performance', gen: (rng) => [ints(rng, N, 0, 2e5)] },
        { name: 'falling', kind: 'performance', gen: () => [range(N).map((i) => N - i)] },
      ],
    },
    answer: [
      'Restating: the biggest gap between a later price and an earlier one, or 0 when prices only fall. N can be 0, so the empty array must return 0, and N is 100,000 so I want one pass.',
      'Brute force tries every buy and sell day pair: O(N²), about 5 billion pairs, too slow.',
      'Optimal: for each day as the sell day, the best buy day is the cheapest price so far. So scan once, keep the running minimum, and track the best of price minus that minimum. That is O(N) time and O(1) space. Starting the best at 0 covers the no-profit case, and updating the minimum before computing the profit is safe because selling on the buy day gives 0.',
      'It is the maximum-subarray problem on the day-to-day differences, which is worth saying aloud. Tests: empty, a single day, falling prices, two days up, and a minimum that comes after the maximum, which a global max minus global min gets wrong.',
    ],
    keyPoints: [
      'Rules out checking every buy and sell pair: O(N²)',
      'Tracks the running minimum price: O(N) time, O(1) space',
      'Links it to maximum subarray on the day-to-day differences',
      'Tests empty, single day, falling prices and a minimum after the maximum',
    ],
    followUps: ['Allow unlimited transactions, one share held at a time.', 'Allow at most two transactions.'],
  },
  {
    id: 'algo-020',
    round: 'algo',
    category: 'Greedy',
    scratch: true,
    question: 'Count the ropes of length at least K after tying neighbours.',
    statement: `N ropes lie in a row, and rope i has length A[i]. You may tie ropes that are next to each other: a group of consecutive ropes tied together becomes one rope whose length is the sum of the group. Every rope belongs to at most one group. Return the largest number of tied-together groups that can each have length at least K.

Example:
  K = 4, A = [1, 2, 3, 4, 1, 1, 3]  →  3   (1+2+3, then 4, then 1+1+3)

Constraints:
  N is an integer in [1..100,000]
  K and each element of A are integers in [1..1,000,000,000]`,
    code: starter('K: number, A: number[]', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (K: number, A: number[]) => {
        let count = 0, length = 0;
        for (const a of A) {
          length += a;
          if (length >= K) { count++; length = 0; }
        }
        return count;
      },
      cases: [
        { name: 'example', kind: 'example', args: [4, [1, 2, 3, 4, 1, 1, 3]], expected: 3 },
        { name: 'never long enough', kind: 'correctness', args: [10, [1, 2]], expected: 0 },
        { name: 'every rope already long', kind: 'correctness', args: [1, [5, 5, 5]], expected: 3 },
        { name: 'values at 10^9', kind: 'correctness', args: [1e9, [1e9, 1e9]], expected: 2 },
        { name: 'leftover at the end', kind: 'correctness', args: [3, [2, 2, 1]], expected: 1 },
        { name: 'random', kind: 'performance', gen: (rng) => [int(rng, 1, 1e6), ints(rng, N, 1, 1e4)] },
      ],
    },
    answer: [
      'Restating: cut the row into consecutive groups and count the groups whose total reaches K. Anything left over that does not reach K simply does not count. N is 100,000 and sums stay below 10^14, so doubles are exact.',
      'Brute force is a DP: best[i] is the most groups in the first i ropes, trying every start of the last group, which is O(N²) even with prefix sums.',
      'Greedy: walk left to right, add each rope to the current group, and the moment the group reaches K, count it and start a new one. This is optimal by an exchange argument: in any optimal answer the first counted group ends at or after the earliest point where the sum reaches K, and cutting it there instead leaves at least as many ropes for the rest, so it is never worse. By induction the whole greedy is optimal. O(N) time, O(1) space.',
      'Longest-first makes no sense, because only neighbours can be tied. Re-summing windows is unnecessary because the running sum resets to 0 after each group. Tests: never reaching K, every rope already long, values at 10^9, and a leftover at the end.',
    ],
    keyPoints: [
      'Rules out the O(N²) DP over group starts',
      'Closes a group the moment it reaches K: O(N) time, O(1) space',
      'Justifies it with an exchange argument: ending the first group earlier never hurts the rest',
      'Tests never reaching K, already-long ropes, values at 10^9 and a leftover at the end',
    ],
    followUps: ['What changes if the ropes form a circle?', 'Return the index where each tied rope ends.'],
  },
  {
    id: 'algo-021',
    round: 'algo',
    category: 'Greedy',
    scratch: true,
    question: 'Count the most non-overlapping segments.',
    statement: `N segments lie on a number line, segment i covering every point from A[i] to B[i], endpoints included, with A[i] <= B[i]. The segments are given sorted by their right end: B is in ascending order. Two segments overlap if they share at least one point, so touching counts. Return the size of the largest set of segments in which no two overlap.

Example:
  A = [1, 3, 7, 9, 9]
  B = [5, 6, 8, 9, 10]  →  3   (segments [1, 5], [7, 8] and [9, 9])

Constraints:
  N is an integer in [0..100,000]
  each element of A and B is an integer in [0..2,000,000,000]
  A[i] <= B[i], and B is sorted in ascending order`,
    code: starter('A: number[], B: number[]', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (A: number[], B: number[]) => {
        let count = 0, end = -Infinity;
        for (let i = 0; i < A.length; i++) {
          if (A[i]! > end) { count++; end = B[i]!; }
        }
        return count;
      },
      cases: [
        { name: 'example', kind: 'example', args: [[1, 3, 7, 9, 9], [5, 6, 8, 9, 10]], expected: 3 },
        { name: 'empty', kind: 'correctness', args: [[], []], expected: 0 },
        { name: 'single', kind: 'correctness', args: [[1], [2]], expected: 1 },
        { name: 'touching counts as overlap', kind: 'correctness', args: [[1, 2], [2, 3]], expected: 1 },
        { name: 'all separate', kind: 'correctness', args: [[1, 3, 5], [2, 4, 6]], expected: 3 },
        { name: 'all overlapping', kind: 'correctness', args: [[1, 1, 1], [5, 6, 7]], expected: 1 },
        { name: 'random', kind: 'performance', gen: (rng) => {
          const segs = Array.from({ length: N }, () => { const a = int(rng, 0, 1e9); return [a, a + int(rng, 0, 1e5)] as const; }).sort((x, y) => x[1] - y[1]);
          return [segs.map((s) => s[0]), segs.map((s) => s[1])];
        } },
      ],
    },
    answer: [
      'Restating: pick as many segments as possible with no shared point, so touching segments conflict. Input is already sorted by right end, N is up to 100,000, and N can be 0.',
      'Brute force is a DP over earlier segments: best[i] is one more than the best over earlier segments that end before i starts. That is O(N²). Trying every subset is exponential.',
      'Greedy: always take the segment that ends first, then skip everything that starts at or before that end, and repeat. Because the input is sorted by end, this is one scan: keep the end of the last chosen segment, and take segment i when A[i] is strictly greater than it. The exchange argument: in any optimal set, swapping the first chosen segment for the earliest-ending one leaves at least as much room for the rest, so the greedy choice is safe. O(N) time and O(1) space given the sort, O(N log N) if I must sort first.',
      'The trap is strict versus non-strict: touching counts as overlap, so the comparison is >. Tests: empty, a single segment, touching, all separate, and all overlapping.',
    ],
    keyPoints: [
      'Rules out the O(N²) DP and exponential subsets',
      'Picks the earliest-ending segment each time: O(N) on sorted input, O(N log N) with the sort',
      'Names the exchange argument for taking the earliest end',
      'Uses a strict > because touching segments overlap',
    ],
    followUps: ['Give each segment a weight and maximise the total weight — what technique replaces the greedy?', 'Find the fewest points that touch every segment.'],
  },
  // ── Dynamic programming ──────────────────────────────────────────────────────────
  {
    id: 'algo-022',
    round: 'algo',
    category: 'Dynamic programming',
    scratch: true,
    question: 'Find the maximal sum of a non-empty slice.',
    statement: `An array A of N integers is given. A slice is a non-empty run of consecutive elements A[P], A[P+1], ..., A[Q] with P <= Q. Return the maximal sum of any slice of A.

Example:
  A = [3, 2, -6, 4, 0]  →  5   (the slice 3, 2)

Constraints:
  N is an integer in [1..100,000]
  each element of A is an integer in [-1,000,000..1,000,000]`,
    code: starter('A: number[]', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (A: number[]) => {
        let best = A[0]!, here = 0;
        for (const v of A) { here = Math.max(v, here + v); best = Math.max(best, here); }
        return best;
      },
      cases: [
        { name: 'example', kind: 'example', args: [[3, 2, -6, 4, 0]], expected: 5 },
        { name: 'single negative', kind: 'correctness', args: [[-5]], expected: -5 },
        { name: 'all negative', kind: 'correctness', args: [[-3, -1, -2]], expected: -1 },
        { name: 'all positive', kind: 'correctness', args: [[1, 2, 3]], expected: 6 },
        { name: 'restart beats carry', kind: 'correctness', args: [[5, -10, 6]], expected: 6 },
        { name: 'random', kind: 'performance', gen: (rng) => [ints(rng, N, -1e6, 1e6)] },
      ],
    },
    answer: [
      'Restating: the largest sum over any non-empty run of consecutive elements. Values can be negative, so the answer can be negative too, and N is 100,000. Sums reach 10^11, which a double holds exactly.',
      'Brute force tries every slice: O(N³) naively, or O(N²) with prefix sums, still about 5 billion pairs.',
      'Optimal is Kadane. Let here be the best sum of a slice ending at the current element. That slice either extends the previous best slice or restarts at this element, so here = max(v, here + v). The answer is the maximum of here over all positions. O(N) time, O(1) space.',
      'The trap is starting the best at 0, which silently allows an empty slice and returns 0 on all-negative input. Initialise it to A[0], or to minus infinity. Tests: a single negative, all negative, all positive, and a case like [5, -10, 6] where restarting beats carrying on.',
    ],
    keyPoints: [
      'Rules out trying every slice: O(N²) even with prefix sums',
      'States the recurrence here = max(v, here + v): O(N) time, O(1) space',
      'Avoids starting the best at 0, which breaks all-negative input',
      'Tests a single negative, all negative, all positive and restart-beats-carry',
    ],
    followUps: ['Return the start and end indexes of the best slice.', 'Find the maximal sum of a circular slice.'],
  },
  {
    id: 'algo-023',
    round: 'algo',
    category: 'Dynamic programming',
    scratch: true,
    question: 'Find the fewest coins that make an amount.',
    statement: `An array coins of K distinct coin values and an integer amount are given. Each value can be used any number of times. Return the fewest coins whose values add up to exactly amount. If that is impossible, return -1. An amount of 0 needs 0 coins.

Example:
  coins = [1, 2, 5], amount = 11  →  3   (5 + 5 + 1)

Constraints:
  K is an integer in [1..10]
  each element of coins is a distinct integer in [1..10,000]
  amount is an integer in [0..100,000]`,
    code: starter('coins: number[], amount: number', 'number', '-1'),
    grader: {
      fn: 'solution',
      reference: (coins: number[], amount: number) => {
        const dp = new Array<number>(amount + 1).fill(Infinity);
        dp[0] = 0;
        for (let a = 1; a <= amount; a++) {
          for (const c of coins) if (c <= a && dp[a - c]! + 1 < dp[a]!) dp[a] = dp[a - c]! + 1;
        }
        return dp[amount] === Infinity ? -1 : dp[amount]!;
      },
      cases: [
        { name: 'example', kind: 'example', args: [[1, 2, 5], 11], expected: 3 },
        { name: 'impossible', kind: 'correctness', args: [[2], 3], expected: -1 },
        { name: 'zero amount', kind: 'correctness', args: [[1], 0], expected: 0 },
        { name: 'greedy is wrong', kind: 'correctness', args: [[1, 3, 4], 6], expected: 2 },
        { name: 'one denomination', kind: 'correctness', args: [[7], 14], expected: 2 },
        { name: 'coin larger than the amount', kind: 'correctness', args: [[5, 10], 1], expected: -1 },
        { name: 'large amount, primes', kind: 'performance', gen: () => [[7, 11, 13, 17, 19, 23], 99_999] },
        { name: 'large impossible amount', kind: 'performance', gen: () => [[2], 99_999] },
      ],
    },
    answer: [
      'Restating: the minimum number of coins, with unlimited supply, that sum to exactly the amount, or -1. Amount is up to 100,000 and there are at most 10 denominations. Amount 0 needs 0 coins.',
      'Brute force is plain recursion: try every coin, then solve for what remains. That is exponential, because the same remainders are solved again and again. The tempting shortcut is greedy, taking the biggest coin first, but it fails: with coins [1, 3, 4] and amount 6 greedy takes 4 + 1 + 1, three coins, when 3 + 3 is two.',
      'Optimal: bottom-up DP over amounts, and in JavaScript it must be bottom-up, because a top-down memoised version recurses about amount divided by the smallest coin deep and overflows the stack. dp[a] is the fewest coins for amount a, with dp[0] = 0 and everything else starting at infinity. The recurrence is dp[a] = 1 + min of dp[a - c] over each coin c that is at most a. The answer is dp[amount], or -1 if it is still infinity. O(amount · K) time, O(amount) space.',
      'Tests: an impossible amount, amount 0, a coin larger than the amount, a single denomination, the greedy counterexample, and the largest amount with only the coin 2, which cannot make an odd total.',
    ],
    keyPoints: [
      'Rules out plain recursion as exponential and shows greedy fails on [1, 3, 4] for 6',
      'States the recurrence dp[a] = 1 + min(dp[a - c])',
      'Bottom-up over amounts, noting top-down recursion overflows the stack in JS: O(amount · K) time, O(amount) space',
      'Returns -1 for an unreachable amount and tests amount 0 and an oversized coin',
    ],
    followUps: ['Count the number of ways to make the amount instead of the fewest coins.', 'Reconstruct which coins make up the answer.'],
  },
  {
    id: 'algo-024',
    round: 'algo',
    category: 'Dynamic programming',
    scratch: true,
    question: 'Maximise the score of a die-rolling board game.',
    statement: `A board has N squares in a row, numbered 0 to N - 1. Square i carries the number A[i], which may be negative. A token starts on square 0 and must finish exactly on square N - 1. On each turn you roll a six-sided die and move the token forward by the result, 1 to 6 squares, and you may choose any result you like, as long as the token stays on the board. The score is the sum of the numbers on all squares the token visits, the start and finish included. Return the maximal score.

Example:
  A = [1, -2, 0, 9, -1, -2]  →  8   (visit squares 0, 2, 3 and 5)

Constraints:
  N is an integer in [2..100,000]
  each element of A is an integer in [-10,000..10,000]`,
    code: starter('A: number[]', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (A: number[]) => {
        const dp = [A[0]!];
        for (let i = 1; i < A.length; i++) {
          let best = -Infinity;
          for (let d = 1; d <= 6 && i - d >= 0; d++) best = Math.max(best, dp[i - d]!);
          dp.push(best + A[i]!);
        }
        return dp[A.length - 1]!;
      },
      cases: [
        { name: 'example', kind: 'example', args: [[1, -2, 0, 9, -1, -2]], expected: 8 },
        { name: 'two squares', kind: 'correctness', args: [[1, 2]], expected: 3 },
        { name: 'both negative', kind: 'correctness', args: [[-1, -1]], expected: -2 },
        // Hand check: seven squares from 0 to 7 cannot be crossed in one roll, so at least one -1 is visited: 5 - 1 + 10 = 14.
        { name: 'the bad stretch is too long to jump', kind: 'correctness', args: [[5, -1, -1, -1, -1, -1, -1, 10]], expected: 14 },
        // Hand check: 0 -> 6 -> 8 touches only square 6, so 0 - 5 + 0 = -5.
        { name: 'seven bad squares, only one visited', kind: 'correctness', args: [[0, -5, -5, -5, -5, -5, -5, -5, 0]], expected: -5 },
        { name: 'random', kind: 'performance', gen: (rng) => [ints(rng, N, -1e4, 1e4)] },
      ],
    },
    answer: [
      'Restating: a path from square 0 to square N - 1 with steps of 1 to 6, maximising the sum of the visited squares, negatives included. Start and finish both count, and N is 100,000.',
      'Brute force recurses over every sequence of rolls, which is exponential: each square has up to six choices. Memoising the best score from each square collapses that, which is the DP.',
      'Optimal: dp[i] is the best score of a path ending on square i. dp[0] = A[0], and for i above 0, dp[i] = A[i] + the maximum of dp[i - d] for d from 1 to 6 while i - d is at least 0. The answer is dp[N - 1]. Each square looks at six predecessors, so O(6N), which is O(N) time. Only the last six values are ever needed, so a ring of six gives O(1) space.',
      'Tests: two squares, both negative, so the forced start and finish give -2, and bad stretches where at least one negative square cannot be avoided, because a die moves at most six squares.',
    ],
    keyPoints: [
      'Rules out recursion over every roll sequence as exponential',
      'States the recurrence dp[i] = A[i] + max(dp[i - d]) over d = 1..6',
      'Notes O(6N) = O(N) time, and O(1) space with a ring of the last six values',
      'Tests two squares, both negative, and a stretch too long to jump over',
    ],
    followUps: ['Return the path itself, not just the score.', 'The die has K faces instead of 6 — how can a sliding-window maximum keep it near O(N)?'],
  },
];
