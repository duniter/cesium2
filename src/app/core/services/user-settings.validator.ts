import {Injectable} from "@angular/core";
import {ValidatorService} from "angular4-material-table";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {UserSettings} from "./model";

@Injectable()
export class UserSettingsValidatorService implements ValidatorService {

  constructor(
    private formBuilder: FormBuilder
  ) {
  }

  getRowValidator(): FormGroup {
    return this.getFormGroup();
  }

  getFormGroup(data?: UserSettings): FormGroup {
    return this.formBuilder.group({
      id: [data && data.id || null],
      locale: [data && data.locale || null, Validators.required],
      content: this.formBuilder.group({

      }),
      nonce: [data && data.nonce || null]
    });
  }
}
