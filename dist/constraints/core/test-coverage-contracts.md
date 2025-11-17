---
id: test-coverage-contracts
name: Test Coverage Contracts
category: quality-testing
severity: error
enabled: true
optional: true
version: 1
group: best-practices
---

HEADER
constraint_id: test-coverage-contracts
severity: error
enforcement_order: 21

PURPOSE
Tie architecture layers to matching test suites so every critical module has the correct test counterpart (unit for domain, integration for app/infra, interaction for UI).

CRITICAL TEST CREATION GUIDE:

✅ DOMAIN TEST EXAMPLE (tests/domain/contacts/contact.test.ts):
```typescript
import { describe, it, expect } from 'vitest';
import { ContactSchema, validateEmail } from '../../../src/domain/contacts/contact';

describe('Contact Domain', () => {
  it('should validate contact schema', () => {
    const valid = { id: '123', firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
    expect(() => ContactSchema.parse(valid)).not.toThrow();
  });
  
  it('should validate email format', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid')).toBe(false);
  });
});
```

✅ APPLICATION SERVICE TEST (tests/application/services/contact-service.test.ts):
```typescript
import { describe, it, expect, vi } from 'vitest';
import { ContactService } from '../../../src/application/services/contact-service';
import type { IContactRepository } from '../../../src/domain/ports/contact-repository';

describe('ContactService', () => {
  it('should create contact via repository port', async () => {
    const mockRepo: IContactRepository = {
      create: vi.fn().mockResolvedValue({ id: '1', firstName: 'John' }),
      findById: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    };
    const service = new ContactService(mockRepo);
    const result = await service.createContact({ firstName: 'John', lastName: 'Doe', email: 'j@ex.com' });
    expect(result.id).toBe('1');
    expect(mockRepo.create).toHaveBeenCalled();
  });
});
```

✅ INFRASTRUCTURE ADAPTER TEST (tests/infra/repositories/contact-repository.test.ts):
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryContactRepository } from '../../../src/infra/repositories/contact-repository';

describe('InMemoryContactRepository', () => {
  let repo: InMemoryContactRepository;
  
  beforeEach(() => {
    repo = new InMemoryContactRepository();
  });
  
  it('should store and retrieve contacts', async () => {
    const contact = { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' };
    const created = await repo.create(contact);
    const found = await repo.findById(created.id);
    expect(found?.firstName).toBe('Jane');
  });
});
```

When creating tests: Use vitest (or jest), mirror directory structure exactly, mock ports not implementations, test public contracts not internals.

SCOPE
include_paths: ["src/domain","src/app","src/infra","src/ui"]
test_roots: {
  domain: "tests/domain",
  app: "tests/app",
  infra: "tests/infra",
  ui: "tests/ui"
}
exclude_paths: ["node_modules","dist","build",".git"]

DEFINITIONS
production-module(layer): source file under the layer include_paths
expected-test-path: mirrored path inside the respective test root (e.g., src/domain/orders/OrderService.ts -> tests/domain/orders/OrderService.test.ts)
infra-adapter-test: integration test verifying adapter behavior with doubles/mocks

FORBIDDEN
- Missing mirrored test files for production modules marked critical (default all)
- Tests importing real infra adapters when they should mock ports
- UI tests lacking interaction/assertion coverage (snapshot-only)
- Domain tests that boot application services or infra layers

ALLOWED
- Minimal "smoke tests" that verify module loads and key exports exist (better than no test)
- Aggregated integration tests covering multiple controllers as long as every production module participates
- Shared helpers located under tests/support
- Additional exploratory tests (performance, contract) referenced in the report
- Single test case per file for rapid prototyping (can expand coverage later)

REQUIRED DATA COLLECTION
coverage_matrix: {
  layer: 'domain' | 'app' | 'infra' | 'ui';
  source_path: string;
  expected_test_path: string;
  test_exists: boolean;
  coverage_kind: 'unit' | 'integration' | 'adapter' | 'interaction' | null;
}[]
improper_test_imports: {
  test_path: string;
  line: number;
  specifier: string;
  resolved_layer: string;
}[]
ui_assertions: {
  test_path: string;
  has_interaction: boolean;
  has_assertions: boolean;
}[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Enumerate production modules per layer and derive expected_test_path using mirrored directories plus `.test.ts` suffix.
- Check filesystem for presence; record coverage_matrix entries with test_exists flag.
- Parse tests to classify coverage_kind (unit/integration/etc.) based on location and helper usage.
- Inspect test imports to ensure domain tests do not import infra adapters and vice versa.
- For UI tests, confirm there is at least one user interaction plus assertion.
```
layers = {
  domain: 'src/domain',
  app: 'src/app',
  infra: 'src/infra',
  ui: 'src/ui'
}
for (layer, srcRoot) in layers:
  files = findFiles(srcRoot, { extensions: ['ts','tsx'] })
  for file in files:
    relative = relativePath(srcRoot, file)
    expected = path.join(test_roots[layer], relative).replace(/\.(ts|tsx)$/, '.test.$1')
    exists = fileExists(expected)
    coverage_matrix.append({
      layer,
      source_path: file,
      expected_test_path: expected,
      test_exists: exists,
      coverage_kind: exists ? inferCoverageKind(expected) : null
    })
    if !exists:
      violations.append({ type: 'missing-test', file_path: file, details: `Expected ${expected}` })

tests = findFiles('tests')
for testFile in tests:
  imports = parseImports(testFile)
  for imp in imports:
    target = resolveLayer(imp)
    if isDomainTest(testFile) and target == 'infra':
      improper_test_imports.append({ test_path: testFile, ... })
  if isUiTest(testFile):
    metrics = analyzeUiTest(testFile)
    ui_assertions.append(metrics)
    if !metrics.has_interaction or !metrics.has_assertions:
      violations.append({ type: 'ui-test-lacks-interaction', file_path: testFile, ... })
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, violation_type, file_path, details. Optional keys: expected_test_path, layer, coverage_kind, specifier. Report each missing test and improper import individually.

FIX SEQUENCE (STRICT)
1. Install test framework if missing: `npm install -D vitest @vitest/ui` or `npm install -D jest @types/jest ts-jest`
2. Create package.json test script: `"test": "vitest"` or `"test": "jest"`
3. For EACH missing test file, create mirrored test with structure from PURPOSE examples:
   - Domain: Test pure functions, Zod schema validation, business logic (no mocks needed)
   - Application: Test service orchestration with MOCKED repository ports (use vi.fn() or jest.fn())
   - Infrastructure: Test adapter implementations with real logic (can use in-memory stores)
   - Presentation: Test route handlers with mocked services
4. Ensure test imports respect layer boundaries (domain tests should NOT import from infra)
5. Re-run validation to confirm all coverage_matrix entries show test_exists = true

REVALIDATION LOOP
```
rerun detection steps and ensure coverage_matrix entries all have test_exists = true (max 2 attempts)
```

SUCCESS CRITERIA (MUST)
- Every production module has a test counterpart
- improper_test_imports array empty
- UI tests record both interactions and assertions

FAILURE HANDLING
If a module cannot be tested due to external vendor code, record a contract test hosted elsewhere and link to it in the report; otherwise treat as failure.

COMMON MISTAKES
- Forgetting to create tests after moving modules between layers
- Copying integration tests into domain suites and importing infra adapters
- Relying solely on snapshots for UI regression coverage

POST-FIX ASSERTIONS
- coverage_matrix shows 100% mirrored files with appropriate coverage_kind
- Tests respect isolation boundaries (domain/unit, app/integration, infra/adapter, ui/interaction)
- UI suites assert user-facing outcomes rather than internal state only

FINAL REPORT SAMPLE
```
{
  "constraint_id": "test-coverage-contracts",
  "violations": [
    {
      "constraint_id": "test-coverage-contracts",
      "violation_type": "missing-test",
      "file_path": "src/domain/payments/PaymentService.ts",
      "details": "Expected tests/domain/payments/PaymentService.test.ts"
    }
  ],
  "fixes_applied": [
    "Added PaymentService unit test mirroring the domain path and mocking BillingPort."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-12T15:28:00Z"
}
```
