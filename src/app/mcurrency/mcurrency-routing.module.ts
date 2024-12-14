import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MconfigurationComponent } from './mconfiguration/mconfiguration.component';
import { EntryComponent } from './entry/entry.component';
import { ReportingComponent } from './reporting/reporting.component';
import { Route } from '../core/route/route.service';
import {ViewEntryComponent} from './view-entry/view-entry.component';
import {MJournalEntryTransactionResolver} from './mcurrency resolvers/m-journal-entry-transaction.resolver';
import {CurrenciesResolver} from './mcurrency resolvers/currencies.resolver';
import {PaymentTypesResolver} from './mcurrency resolvers/payment-types.resolver';
import {GlAccountResolver} from './mcurrency resolvers/gl-account.resolver'
import {OfficesResolver} from './mcurrency resolvers/offices.resolver';

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
        glAccount: GlAccountResolver
      },
      children: [
        {
          path: 'transactions',
          data: {title: 'Transactions', breadcrumb: 'Multi-currency Transactions', addBreadcrumbLink: false},
          children: [
            {
              path: 'view/:id',
              component: ViewEntryComponent,
              data: { title: 'View Transaction', routeParamBreadcrumb: 'id' },
              resolve: {
                transaction: MJournalEntryTransactionResolver
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
