# Metadata fields

The editor manages only the following top-level CWL keys. All other top-level entries remain outside the form's model.

## Root properties

| Form section | CWL key | Shape | Notes |
| --- | --- | --- | --- |
| Namespace | `$namespaces` | mapping | The form emits `s: https://schema.org/`. |
| Type | `@type` | string | The form emits `s:SoftwareApplication`. |
| Name | `s:name` | string | Marked required in the form. |
| Description | `s:description` | string | Marked required; multiline text is supported. |
| Creation date | `s:dateCreated` | date string | Marked required; entered as `YYYY-MM-DD`. |
| Licenses | `s:license` | object or list | One item is represented as an object; multiple items as a list. |
| Unique identifier | `s:identifier` | string | Optional. |
| Alternative identifier URLs | `s:sameAs` | string or list | Enter one value per line. |
| Keywords | `s:keywords` | list | Contains strings and/or `s:DefinedTerm` objects. |
| Operating systems | `s:operatingSystem` | list | Selected from the bundled list. |
| Software requirements | `s:softwareRequirements` | list | Enter one runtime, dependency, or URL per line. |
| Software version | `s:softwareVersion` | string | Marked required; the input expects Semantic Versioning 2.0.0. |
| Software help | `s:softwareHelp` | list | `s:CreativeWork` objects. |
| Publisher | `s:publisher` | object | An `s:Organization`. |
| Authors | `s:author` | list | `s:Person` or role-wrapped person objects. |
| Contributors | `s:contributor` | list | `s:Person` or role-wrapped person objects. |

Required markers are form guidance. Because the document is updated incrementally, an in-progress edit can temporarily contain incomplete metadata. Validate the finished document as part of your normal development checks.

## Reusable objects

### License and software help

Both use `s:CreativeWork`:

```yaml
'@type': s:CreativeWork
s:identifier: Apache-2.0
s:name: Apache License 2.0
s:url: https://spdx.org/licenses/Apache-2.0.html
```

License name and URL are filled from the chosen SPDX identifier. A help entry uses `s:name` and `s:url`; it normally has no identifier.

### Organization

Publishers and affiliations use:

```yaml
'@type': s:Organization
s:name: Example Research Institute
s:email: contact@example.org
s:identifier: https://ror.org/012345678
```

Only the name is marked required for the publisher and affiliation. Email and identifier are optional.

### Person

Authors and contributors use:

```yaml
'@type': s:Person
s:givenName: Ada
s:familyName: Lovelace
s:email: ada@example.org
s:identifier: https://orcid.org/0000-0000-0000-0000
s:affiliation:
  '@type': s:Organization
  s:name: Example Research Institute
```

Given name, family name, email, and affiliation name are marked required.

### Role-wrapped person

When role data is supplied, a person is nested below an `s:Role`. For an author:

```yaml
'@type': s:Role
s:roleName: Software
s:startDate: '2025-01-01'
s:author:
  '@type': s:Person
  s:givenName: Ada
  s:familyName: Lovelace
  s:email: ada@example.org
```

A contributor uses `s:contributor` inside the role. Role name choices follow the bundled CRediT taxonomy; start date, end date, and additional type are optional.

### Defined term

Structured GCMD Science keywords use:

```yaml
'@type': s:DefinedTerm
s:name: ATMOSPHERIC TEMPERATURE
s:description: A controlled science keyword.
s:termCode: example-concept-id
s:inDefinedTermSet: https://gcmd.earthdata.nasa.gov/kms/concepts/concept_scheme/sciencekeywords
```

The hierarchical picker fills the term values. They share the `s:keywords` list with plain keyword strings.

## Serialization rules

- Empty optional values and empty objects are omitted.
- `s:license` and `s:sameAs` use a scalar/object when there is one value and a list when there are several.
- `s:operatingSystem`, `s:softwareRequirements`, `s:softwareHelp`, `s:author`, and `s:contributor` are emitted as lists when present.
- Duplicate text and Earth Observation keywords are removed case-insensitively after trimming.
- Metadata keys are written in the order shown in the root-properties table.
