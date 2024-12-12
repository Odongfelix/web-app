import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MconfigurationComponent } from './mconfiguration/mconfiguration.component';
import { EntryComponent } from './entry/entry.component';
import { ReportingComponent } from './reporting/reporting.component';
import { ShellComponent } from '../core/shell/shell.component';
import { Route } from '../core/route/route.service';
import * as path from 'path';
import {
  ViewJournalEntryTransactionComponent
} from '../shared/accounting/view-journal-entry-transaction/view-journal-entry-transaction.component';
import { JournalEntryTransactionResolver } from '../accounting/common-resolvers/journal-entry-transaction.resolver';
import { CurrenciesResolver } from '../organization/currencies/currencies.resolver';
import { PaymentTypesResolver } from '../organization/payment-types/payment-types.resolver';
import { GlAccountsResolver } from '../accounting/common-resolvers/gl-accounts.resolver';
import { OfficesResolver } from '../navigation/offices.resolver';

const routes: Routes = [
  Route.withShell([
    {
      path: '',
      redirectTo: 'configuration',
      pathMatch: 'full',
    },
    {
      path: 'configuration',
      component: MconfigurationComponent,
      data: {title: 'configuration', breadcrumb: 'Multi-currency Configuration'},
    },
    {
      path: 'entry',
      component: EntryComponent,
      data: {title: 'Entry', breadcrumb: 'Multi-currency Journal Entry'},
      resolve: {
        office: OfficesResolver,
        currencies: CurrenciesResolver,
        paymentTypes: PaymentTypesResolver,
        glAccount: GlAccountsResolver
      },
      children: [
        {
          path: 'transactions',
          data: {title: 'Transactions', breadcrumb: 'Multi-currency Transactions', addBreadcrumbLink: false},
          children: [
            {
              path: 'view/:id',
              component: ViewJournalEntryTransactionComponent,
              data: { title: 'View Transaction', routeParamBreadcrumb: 'id' },
              resolve: {
                transaction: JournalEntryTransactionResolver
              }
            }
          ]
        }
      ]
    },
    {
      path: 'reporting',
      component: ReportingComponent,
      data: {title: 'Reporting', breadcrumb: 'Multi-currency Reporting'},
    }
  ])
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class McurrencyRoutingModule { }
