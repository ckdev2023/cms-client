import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { Pool } from "pg";

import { HealthController } from "./health/health.controller";
import { AuthController } from "./modules/core/auth/auth.controller";
import { AuthGuard } from "./modules/core/auth/auth.guard";
import { AuthService } from "./modules/core/auth/auth.service";
import { EffectivePermissionsService } from "./modules/core/auth/effective-permissions.service";
import { PermissionsGuard } from "./modules/core/auth/permissions.guard";
import { PermissionsService } from "./modules/core/auth/permissions.service";
import { RequestContextInterceptor } from "./modules/core/auth/requestContext.interceptor";
import { JobsController } from "./modules/core/jobs/jobs.controller";
import { JobsService } from "./modules/core/jobs/jobs.service";
import { CasesController } from "./modules/core/cases/cases.controller";
import {
  CasesService,
  TEMPLATES_RESOLVER,
} from "./modules/core/cases/cases.service";
import { BillingCollectionsController } from "./modules/core/billing/billingCollections.controller";
import { BillingCollectionsService } from "./modules/core/billing/billingCollections.service";
import { BillingPlansController } from "./modules/core/billing/billingPlans.controller";
import { BillingPlansService } from "./modules/core/billing/billingPlans.service";
import { BillingSummaryController } from "./modules/core/billing/billingSummary.controller";
import { BillingSummaryService } from "./modules/core/billing/billingSummary.service";
import { PaymentRecordsController } from "./modules/core/billing/paymentRecords.controller";
import { PaymentRecordsService } from "./modules/core/billing/paymentRecords.service";
import { DocumentAssetsController } from "./modules/core/document-assets/documentAssets.controller";
import { DocumentAssetsService } from "./modules/core/document-assets/documentAssets.service";
import { DocumentFilesController } from "./modules/core/document-files/documentFiles.controller";
import { DocumentFilesService } from "./modules/core/document-files/documentFiles.service";
import { DocumentItemsController } from "./modules/core/document-items/documentItems.controller";
import { DocumentItemsService } from "./modules/core/document-items/documentItems.service";
import { DocumentRequirementFileRefsController } from "./modules/core/document-requirement-file-refs/documentRequirementFileRefs.controller";
import { DocumentRequirementFileRefsService } from "./modules/core/document-requirement-file-refs/documentRequirementFileRefs.service";
import { RemindersController } from "./modules/core/reminders/reminders.controller";
import { RemindersService } from "./modules/core/reminders/reminders.service";
import { ResidencePeriodsController } from "./modules/core/residence-periods/residencePeriods.controller";
import { ResidencePeriodsService } from "./modules/core/residence-periods/residencePeriods.service";
import { CaseTemplatesController } from "./modules/core/case-templates/caseTemplates.controller";
import { CaseTemplatesService } from "./modules/core/case-templates/caseTemplates.service";
import { DocumentTemplatesController } from "./modules/core/document-templates/documentTemplates.controller";
import { DocumentTemplatesService } from "./modules/core/document-templates/documentTemplates.service";
import { GeneratedDocumentsController } from "./modules/core/generated-documents/generatedDocuments.controller";
import { GeneratedDocumentsService } from "./modules/core/generated-documents/generatedDocuments.service";
import { ReviewRecordsController } from "./modules/core/review-records/reviewRecords.controller";
import { ReviewRecordsService } from "./modules/core/review-records/reviewRecords.service";
import { CommunicationLogsController } from "./modules/core/communication-logs/communicationLogs.controller";
import { CommunicationLogsService } from "./modules/core/communication-logs/communicationLogs.service";
import { SubmissionPackagesController } from "./modules/core/submission-packages/submissionPackages.controller";
import { SubmissionPackagesService } from "./modules/core/submission-packages/submissionPackages.service";
import { TasksController } from "./modules/core/tasks/tasks.controller";
import { TasksService } from "./modules/core/tasks/tasks.service";
import { ValidationRunsController } from "./modules/core/validation-runs/validationRuns.controller";
import { ValidationAutoRunService } from "./modules/core/validation-runs/validationAutoRun.service";
import { ValidationRunsService } from "./modules/core/validation-runs/validationRuns.service";
import { CompaniesController } from "./modules/core/companies/companies.controller";
import { CompaniesService } from "./modules/core/companies/companies.service";
import { ContactPersonsController } from "./modules/core/contact-persons/contactPersons.controller";
import { ContactPersonsService } from "./modules/core/contact-persons/contactPersons.service";
import { DashboardController } from "./modules/core/dashboard/dashboard.controller";
import { DashboardService } from "./modules/core/dashboard/dashboard.service";
import { CasePartiesController } from "./modules/core/case-parties/caseParties.controller";
import { CasePartiesService } from "./modules/core/case-parties/caseParties.service";
import { CustomersController } from "./modules/core/customers/customers.controller";
import { CustomersService } from "./modules/core/customers/customers.service";
import { GroupMembersService } from "./modules/core/groups/groupMembers.service";
import { GroupsController } from "./modules/core/groups/groups.controller";
import { GroupsService } from "./modules/core/groups/groups.service";
import { OrganizationsController } from "./modules/core/organizations/organizations.controller";
import { OrganizationsService } from "./modules/core/organizations/organizations.service";
import { TimelineController } from "./modules/core/timeline/timeline.controller";
import { TimelineService } from "./modules/core/timeline/timeline.service";
import { FeatureFlagsController } from "./modules/feature-flags/featureFlags.controller";
import { FeatureFlagsService } from "./modules/feature-flags/featureFlags.service";
import { TemplatesController } from "./modules/templates/templates.controller";
import { TemplatesService } from "./modules/templates/templates.service";
import { AppUsersController } from "./modules/portal/app-users/appUsers.controller";
import { AppUsersService } from "./modules/portal/app-users/appUsers.service";
import { LeadsController } from "./modules/portal/leads/leads.controller";
import { LeadsService } from "./modules/portal/leads/leads.service";
import { LeadsAdminController } from "./modules/core/leads/leads.admin.controller";
import { LeadsAdminService } from "./modules/core/leads/leads.admin.service";
import { ConversationsAdminController } from "./modules/core/conversations/conversations.admin.controller";
import { ConversationsAdminService } from "./modules/core/conversations/conversations.admin.service";
import { SearchController } from "./modules/core/search/search.controller";
import { SearchService } from "./modules/core/search/search.service";
import { MePermissionsController } from "./modules/core/auth/mePermissions.controller";
import { PermissionOverridesController } from "./modules/core/auth/permissionOverrides.controller";
import { PermissionOverridesService } from "./modules/core/auth/permissionOverrides.service";
import { RolesAdminController } from "./modules/core/auth/rolesAdmin.controller";
import { RolesAdminService } from "./modules/core/auth/rolesAdmin.service";
import { UsersController } from "./modules/core/users/users.controller";
import { UsersService } from "./modules/core/users/users.service";
import { MessagesAdminController } from "./modules/core/conversations/messages.admin.controller";
import { MessagesAdminService } from "./modules/core/conversations/messages.admin.service";
import { ConversationsController } from "./modules/portal/conversations/conversations.controller";
import { ConversationsService } from "./modules/portal/conversations/conversations.service";
import { MessagesController } from "./modules/portal/messages/messages.controller";
import { MessagesService } from "./modules/portal/messages/messages.service";
import { UserDocumentsController } from "./modules/portal/user-documents/userDocuments.controller";
import { UserDocumentsService } from "./modules/portal/user-documents/userDocuments.service";
import { IntakeController } from "./modules/portal/intake/intake.controller";
import { IntakeService } from "./modules/portal/intake/intake.service";
import { AppUserAuthController } from "./modules/portal/auth/appUserAuth.controller";
import { AppUserAuthService } from "./modules/portal/auth/appUserAuth.service";
import { AppUserAuthGuard } from "./modules/portal/auth/appUserAuth.guard";
import { loadEnv } from "./config/env";
import { createPgPool } from "./infra/db/createPgPool";
import {
  createRedisClient,
  REDIS_CLIENT,
} from "./infra/redis/createRedisClient";
import {
  STORAGE_ADAPTER,
  createStorageAdapter,
} from "./infra/storage/storageAdapter";

/**
 * 应用根模块。
 */
@Module({
  controllers: [
    HealthController,
    AuthController,
    TimelineController,
    TemplatesController,
    FeatureFlagsController,
    JobsController,
    CompaniesController,
    ContactPersonsController,
    DashboardController,
    GroupsController,
    OrganizationsController,
    CustomersController,
    CasesController,
    BillingCollectionsController,
    BillingPlansController,
    BillingSummaryController,
    PaymentRecordsController,
    CasePartiesController,
    DocumentAssetsController,
    DocumentFilesController,
    DocumentItemsController,
    DocumentRequirementFileRefsController,
    RemindersController,
    ResidencePeriodsController,
    ValidationRunsController,
    CaseTemplatesController,
    DocumentTemplatesController,
    GeneratedDocumentsController,
    ReviewRecordsController,
    SubmissionPackagesController,
    TasksController,
    CommunicationLogsController,
    AppUsersController,
    LeadsController,
    LeadsAdminController,
    ConversationsAdminController,
    MessagesAdminController,
    SearchController,
    UsersController,
    RolesAdminController,
    PermissionOverridesController,
    MePermissionsController,
    ConversationsController,
    MessagesController,
    UserDocumentsController,
    IntakeController,
    AppUserAuthController,
  ],
  providers: [
    Reflector,
    AuthService,
    EffectivePermissionsService,
    PermissionsService,
    {
      provide: Pool,
      useFactory: () => createPgPool(loadEnv().dbUrl),
    },
    {
      provide: REDIS_CLIENT,
      useFactory: () => createRedisClient(loadEnv().redisUrl),
    },
    TimelineService,
    TemplatesService,
    JobsService,
    FeatureFlagsService,
    CompaniesService,
    ContactPersonsService,
    DashboardService,
    GroupMembersService,
    GroupsService,
    OrganizationsService,
    CustomersService,
    CasesService,
    BillingCollectionsService,
    BillingPlansService,
    BillingSummaryService,
    PaymentRecordsService,
    CasePartiesService,
    DocumentAssetsService,
    DocumentFilesService,
    DocumentItemsService,
    DocumentRequirementFileRefsService,
    RemindersService,
    ResidencePeriodsService,
    ValidationRunsService,
    ValidationAutoRunService,
    CaseTemplatesService,
    DocumentTemplatesService,
    GeneratedDocumentsService,
    ReviewRecordsService,
    SubmissionPackagesService,
    TasksService,
    CommunicationLogsService,
    AppUsersService,
    LeadsService,
    LeadsAdminService,
    ConversationsAdminService,
    MessagesAdminService,
    SearchService,
    UsersService,
    RolesAdminService,
    PermissionOverridesService,
    ConversationsService,
    MessagesService,
    UserDocumentsService,
    IntakeService,
    AppUserAuthService,
    AppUserAuthGuard,
    {
      provide: STORAGE_ADAPTER,
      useFactory: () => {
        const env = loadEnv();
        return createStorageAdapter({
          provider: env.storageProvider,
          localDir: env.storageLocalDir,
          s3Bucket: env.storageS3Bucket,
          s3Region: env.storageS3Region,
          s3Endpoint: env.storageS3Endpoint,
        });
      },
    },
    {
      provide: TEMPLATES_RESOLVER,
      useExisting: TemplatesService,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
