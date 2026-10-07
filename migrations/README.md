# Contract families and auction enums

For an existing database, run `20261006-contract-family-auction-enums.sql` once before starting this version (including installations using `DB_SYNCHRONIZE=true`):

```sh
psql -v ON_ERROR_STOP=1 -f migrations/20261006-contract-family-auction-enums.sql
```

Use the normal PostgreSQL connection configuration for the target database. The script is transactional. Known Vietnamese auction labels are converted to the enum values; empty values become NULL. Unknown labels cause a rollback rather than losing data. Inspect and correct unknown values before rerunning. Fresh databases can use the project's existing TypeORM schema synchronization.

Existing contract types and numbers are preserved. Historical amended contracts cannot be reliably linked automatically: set their `parentContractId` using `PATCH /contract/:id` after deployment. The API derives `contractType` on creation and update; clients must stop submitting `contractType`. Omitted/blank contract numbers are stored as NULL; supplied numbers remain unique. `parentContractId: null` removes the parent on update. Deleting a parent with children is blocked.

A child inherits the parent's property links on creation only when `propertyIds` is omitted; an explicit list (including `[]`) overrides inheritance. Searches (`search`, `contractNumber`, `propertyId`) match across the whole connected contract family, including multiple resale generations. Other filters still apply to each returned contract. Pagination, reports, and exports use the same matching rules.

## Auction registrations and result notes

After the contract-family migration, run `20261007-auction-registrations.sql` before restarting the API:

```sh
psql -v ON_ERROR_STOP=1 -f migrations/20261007-auction-registrations.sql
```

This adds `NHAN_VIEN_BAN_HO_SO` to the user role enum, creates the auction registration table, and adds nullable `auction_result.note`. Existing winner JSON remains unchanged. The registration API, including its contract lookup with auction amounts and schedule, allows `ADMIN` and `NHAN_VIEN_BAN_HO_SO` only. Assign the staff role through user management. The page is `/auction-registrations` (the existing `/admin/auction-registrations` route uses the same role check).

Payment dates are optional and can be cleared with `null`. Eligibility is explicitly selected by staff, independently of the payment statuses. Contracts with registrations cannot be deleted until their registrations are removed.

Auction validation runs on both create and partial update. Regulations require `startRegisterDate < endRegisterDate < auctionDate` and `depositAmount < startingPrice`. Provided registration payment dates must be strictly inside the registration window, compared as calendar dates in Vietnam time. Results require `winningPrice >= startingPrice` and `completedAt > auctionDate`. Auction details use the latest announcement, then the latest regulation, then contract values. A missing schedule must be supplied before saving dated payments or auction results. These validations require no additional database migration.
