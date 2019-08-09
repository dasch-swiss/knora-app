import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule, MatChipsModule, MatDialogModule, MatDialogRef, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatTreeModule, MAT_DIALOG_DATA } from '@angular/material';
import { KuiActionModule } from '@knora/action';
import { TranslateModule } from '@ngx-translate/core';
import { ListDataComponent } from 'src/app/project/list/list-data/list-data.component';
import { ProjectFormComponent } from 'src/app/project/project-form/project-form.component';
import { UserFormComponent } from 'src/app/user/user-form/user-form.component';
import { UserPasswordComponent } from 'src/app/user/user-form/user-password/user-password.component';
import { DialogHeaderComponent } from './dialog-header/dialog-header.component';
import { DialogComponent } from './dialog.component';

describe('DialogComponent', () => {
    let component: DialogComponent;
    let fixture: ComponentFixture<DialogComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [
                DialogComponent,
                DialogHeaderComponent,
                UserFormComponent,
                UserPasswordComponent,
                ProjectFormComponent,
                ListDataComponent
            ],
            imports: [
                KuiActionModule,
                MatButtonModule,
                MatChipsModule,
                MatDialogModule,
                MatFormFieldModule,
                MatIconModule,
                MatInputModule,
                MatSelectModule,
                MatSlideToggleModule,
                MatTreeModule,
                ReactiveFormsModule,
                TranslateModule.forRoot()
            ],
            providers: [
                { provide: MatDialogRef, useValue: {} },
                { provide: MAT_DIALOG_DATA, useValue: [] }
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(DialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
