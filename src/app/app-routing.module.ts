import { NgModule } from '@angular/core';
import { Routes, RouterModule, ExtraOptions } from '@angular/router';
import { HomePage } from './core/home/home';
import { RegisterConfirmPage } from './core/register/confirm/confirm';
import { AccountPage } from './core/account/account';
import { AuthGuardService } from './core/core.module';
import { WotSearchPage } from './wot/pages/search';

const routeOptions: ExtraOptions = {
  enableTracing: false,
  //enableTracing: !environment.production,
  useHash: false
};

const routes: Routes = [
  // Core path
  {
    path: '',
    component: HomePage
  },

  {
    path: 'home/:action',
    component: HomePage
  },
  {
    path: 'confirm/:email/:code',
    component: RegisterConfirmPage
  },
  {
    path: 'account',
    component: AccountPage,
    canActivate: [AuthGuardService]
  },

  // Wot
  {
    path: 'wot/search',
    component: WotSearchPage,
    data: {
    }
  },  

  {
    path: "**",
    redirectTo: '/'
  },
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, routeOptions)
  ],
  exports: [
    RouterModule
  ]
})
export class AppRoutingModule { }
