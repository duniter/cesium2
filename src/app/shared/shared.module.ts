import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {MaterialModule} from "./material/material.module";
import {ReactiveFormsModule} from "@angular/forms";
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {IonicModule} from "@ionic/angular";
import {AutofocusDirective} from "./directives/autofocus.directive";
import {DateFormatPipe} from "./pipes/date-format.pipe";
import {DateDiffDurationPipe} from "./pipes/date-diff-duration.pipe";
import {LatLongFormatPipe} from "./pipes/latlong-format.pipe";
import {NumberFormatPipe} from "./pipes/number-format.pipe";
import {HighlightPipe} from "./pipes/highlight.pipe";
import {ToolbarComponent} from "./toolbar/toolbar";
import {MatDateTime} from "./material/material.datetime";
import {MatLatLong} from "./material/material.latlong";
import {MatBooleanField} from "./material/material.boolean";
import {MatAutocompleteField} from "./material/material.autocomplete";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {TextMaskModule} from "angular2-text-mask";
import {MatPaginatorIntl} from "@angular/material";
import {MatPaginatorI18n} from "./material/material.paginator-i18n";
import {ProgressBarService} from "./services/progress-bar.service";
import {HTTP_INTERCEPTORS} from "@angular/common/http";
import {ProgressInterceptor} from "./interceptors/progess.interceptor";
import {AppFormField} from "./form/field.component";
import {
  SuggestionDataService,
  DataService,
  LoadResult,
  TableDataService,
  EditorDataService,
  EditorDataServiceLoadOptions,
  FetchOptions,
  WatchFetchOptions
} from "./services/data-service.class";
import {
  fromDateISOString,
  isNil,
  isNilOrBlank,
  isNotNil,
  isNotNilOrBlank,
  isNotEmptyArray,
  nullIfUndefined,
  toBoolean,
  toFloat,
  toInt,
  toDateISOString,
  startsWithUpperCase,
  attributeComparator,
  joinProperties,
  selectInputContent,
  filterNumberInput,
  sort,
  exact,
  match
} from "./functions";
import {fadeInAnimation, fadeInOutAnimation} from "./material/material.animations";
import {InputElement, FormFieldDefinition, FieldEnumValue} from "./form/field.model";
import {NgxMaterialTimepickerModule} from "ngx-material-timepicker";
import {Color, ColorScale, ColorScaleLegendItem} from "./graph/graph-colors";
import {ColorPickerModule} from 'ngx-color-picker';
import {FormButtonsBarComponent} from "../core/form/form-buttons-bar.component";
import {AboutModal} from "../core/about/modal-about";

export {
  DataService, SuggestionDataService, TableDataService, LoadResult,
  EditorDataService, EditorDataServiceLoadOptions, FetchOptions,
  WatchFetchOptions,
  isNil, isNilOrBlank, isNotNil, isNotNilOrBlank, isNotEmptyArray, nullIfUndefined,
  toBoolean, toFloat, toInt,
  toDateISOString, fromDateISOString,
  startsWithUpperCase,
  attributeComparator, joinProperties, sort,
  selectInputContent, filterNumberInput,
  exact, match,
  fadeInAnimation, fadeInOutAnimation,
  DateFormatPipe, ToolbarComponent,
  Color, ColorScale, ColorScaleLegendItem, InputElement,
  FormFieldDefinition, FieldEnumValue
};

@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    TextMaskModule,
    IonicModule,
    TranslateModule.forChild(),
    NgxMaterialTimepickerModule.forRoot(),
    ColorPickerModule
  ],
  declarations: [
    AutofocusDirective,
    ToolbarComponent,
    DateFormatPipe,
    DateDiffDurationPipe,
    LatLongFormatPipe,
    HighlightPipe,
    NumberFormatPipe,
    MatDateTime,
    MatLatLong,
    MatBooleanField,
    MatAutocompleteField,
    AppFormField
  ],
  exports: [
    MaterialModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    IonicModule,
    AutofocusDirective,
    ToolbarComponent,
    DateFormatPipe,
    DateDiffDurationPipe,
    LatLongFormatPipe,
    HighlightPipe,
    NumberFormatPipe,
    TextMaskModule,
    TranslateModule,
    MatDateTime,
    MatLatLong,
    MatBooleanField,
    MatAutocompleteField,
    ColorPickerModule,
    AppFormField
  ],
  providers: [
    DateFormatPipe,
    DateDiffDurationPipe,
    LatLongFormatPipe,
    HighlightPipe,
    NumberFormatPipe,
    ProgressBarService,
    {provide: HTTP_INTERCEPTORS, useClass: ProgressInterceptor, multi: true, deps: [ProgressBarService]},
    {
      provide: MatPaginatorIntl,
      useFactory: (translate) => {
        const service = new MatPaginatorI18n();
        service.injectTranslateService(translate);
        return service;
      },
      deps: [TranslateService]
    }
  ]
})
export class SharedModule {
}
