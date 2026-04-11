import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { Pool } from "pg";

import { HealthController } from "./health/health.controller";
import { AuthController } from "./modules/core/auth/auth.controller";
import { AuthGuard } from "./modules/core/auth/auth.guard";
import { PermissionsService } from "./modules/core/auth/permissions.service";
import { RequestContextInterceptor } from "./modules/core/auth/requestContext.interceptor";
import { JobsController } from "./modules/core/jobs/jobs.controller";
import { JobsService } from "./modules/core/jobs/jobs.service";
import { CasesController } from "./modules/core/cases/cases.controller";
import {
  CasesService,
  TEMPLATES_RESOLVER,
} from "./modules/core/cases/cases.service";
import { BillingPlansController } from "./modules/core/billing/billingPlans.controller";
import { BillingPlansService } from "./modules/core/billing/billingPlans.service";
import { PaymentRecordsController } from "./modules/core/billing/paymentRecords.controller";
import { PaymentRecordsService } from "./modules/core/billing/paymentRecords.service";
import { DocumentFilesController } from "./modules/core/document-files/documentFiles.controller";
import { DocumentFilesService } from "./modules/core/document-files/documentFiles.service";
import { DocumentItemsController } from "./modules/core/document-items/documentItems.controller";
import { DocumentItemsService } from "./modules/core/document-items/documentItems.service";
import { RemindersController } from "./modules/core/reminders/reminders.controller";
import { RemindersService } from "./modules/core/reminders/reminders.service";
import { CommunicationLogsController } from "./modules/core/communication-logs/communicationLogs.controller";
import { CommunicationLogsService } from "./modules/core/communication-logs/communicationLogs.service";
import { TasksController } from "./modules/core/tasks/tasks.controller";
import { TasksService } from "./modules/core/tasks/tasks.service";
import { CompaniesController } from "./modules/core/companies/companies.controller";
import { CompaniesService } from "./modules/core/companies/companies.service";
import { ContactPersonsController } from "./modules/core/contact-persons/contactPersons.controller";
import { ContactPersonsService } from "./modules/core/contact-persons/contactPersons.service";
import { CasePartiesController } from "./modules/core/case-parties/caseParties.controller";
import { CasePartiesService } from "./modules/core/case-parties/caseParties.service";
import { CustomersController } from "./modules/core/customers/customers.controller";
import { CustomersService } from "./modules/core/customers/customers.service";
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
    CustomersController,
    CasesController,
    BillingPlansController,
    PaymentRecordsController,
    CasePartiesController,
    DocumentFilesController,
    DocumentItemsController,
    RemindersController,
    TasksController,
    CommunicationLogsController,
    AppUsersController,
    LeadsController,
    ConversationsController,
    MessagesController,
    UserDocumentsController,
    IntakeController,
    AppUserAuthController,
  ],
  providers: [
    Reflector,
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
    CustomersService,
    CasesService,
    BillingPlansService,
    PaymentRecordsService,
    CasePartiesService,
    DocumentFilesService,
    DocumentItemsService,
    RemindersService,
    TasksService,
    CommunicationLogsService,
    AppUsersService,
    LeadsService,
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
  ],
})
export class AppModule {}
