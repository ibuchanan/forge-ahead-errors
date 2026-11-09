# How to define domain problems and codes

Use an app-owned catalog when a Command needs stable problem types and codes without depending on a transport library.

## Define the catalog

Choose a base URI for your app's problem types. Give each named failure a title and, where needed, an application-defined integer `code`:

```ts
import {
  createProblemCatalog,
  err,
  isProblemDetailsWithCode,
  ok,
  type DomainProblemDetails,
  type Result,
} from "@forge-ahead/errors";

const problems = createProblemCatalog("https://example.com/problems", {
  "widget-not-found": { title: "Widget not found", code: 1001 },
  "widget-unavailable": { title: "Widget unavailable" },
});

const notFound = problems.get("widget-not-found");
if (!notFound) throw new Error("Missing widget-not-found definition");

// The Command layer imports only the problem library, not any transport library.
const findWidget = (id: string): Result<string, DomainProblemDetails> => {
  if (id === "known") return ok("Widget");
  return err(notFound.create(`No widget with id ${id}`, { instance: id }));
};

const result = findWidget("missing");
result.match(
  (widget) => console.log(widget),
  (problem) => console.log(problem.type, problem.detail),
);

function codeOf(value: unknown): number | undefined {
  return isProblemDetailsWithCode(value) ? value.code : undefined;
}

if (result.isErr()) console.log(codeOf(result.error)); // 1001
```

The named type resolves to `https://example.com/problems/widget-not-found`. The Command returns a `Result` with `DomainProblemDetails` as its single error type; a downstream transport can project that problem independently. A catalog entry without a code remains a valid problem, and `codeOf` returns `undefined` for it or for any other value without a safe integer code. Set `status` on a definition only when the domain needs an HTTP status; it is not required for a Command problem.
