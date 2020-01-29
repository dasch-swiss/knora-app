import { Component, EventEmitter, Inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { existingNamesValidator } from '@knora/action';
import { ApiResponseData, ApiResponseError, KnoraApiConnection, ProjectResponse, ReadProject } from '@knora/api';
import { KnoraApiConnectionToken, OntologyService } from '@knora/core';
import { CacheService } from 'src/app/main/cache/cache.service';

export interface NewOntology {
    projectIri: string;
    name: string;
    label: string;
}

@Component({
    selector: 'app-ontology-form',
    templateUrl: './ontology-form.component.html',
    styleUrls: ['./ontology-form.component.scss']
})
export class OntologyFormComponent implements OnInit {

    loading: boolean;

    // project short code
    @Input() projectcode: string;

    @Output() closeDialog: EventEmitter<any> = new EventEmitter<any>();

    @Output() updateParent: EventEmitter<string> = new EventEmitter<string>();

    project: ReadProject;

    ontologyForm: FormGroup;

    ontologyLabel: string = '';

    nameRegex = /^(?![v|V][0-9]).[a-zA-Z]\S*$/;

    forbiddenNames: string[] = [
        'knora',
        'salsah',
        'standoff',
        'ontology',
        'simple',
        'shared'
    ];

    existingNames: [RegExp] = [
        new RegExp('anEmptyRegularExpressionWasntPossible')
    ];

    nameMinLength = 3;
    nameMaxLength = 16;

    formErrors = {
        'name': ''
    };

    validationMessages = {
        'name': {
            'required': 'Name is required.',
            'minlength': 'Name must be at least ' + this.nameMinLength + ' characters long.',
            'maxlength': 'Name cannot be more than ' + this.nameMaxLength + ' characters long.',
            'pattern': 'Name shouldn\'t start with a number or v + number; Spaces or special characters are not allowed.',
            'existingName': 'This name is not allowed.'
        }
    };

    constructor(
        @Inject(KnoraApiConnectionToken) private knoraApiConnection: KnoraApiConnection,
        private _cache: CacheService,
        private _fb: FormBuilder,
        private _router: Router,
        private _ontologyService: OntologyService) { }

    ngOnInit() {

        this.loading = true;

        // set the cache
        this._cache.get(this.projectcode, this.knoraApiConnection.admin.projectsEndpoint.getProjectByShortcode(this.projectcode));

        // get project
        this._cache.get(this.projectcode, this.knoraApiConnection.admin.projectsEndpoint.getProjectByShortcode(this.projectcode)).subscribe(
            (response: ApiResponseData<ProjectResponse>) => {
                this.project = response.body.project;

                this.buildForm();

                this.loading = false;
            },
            (error: ApiResponseError) => {
                console.error(error);
                this.loading = false;
            }
        );

    }

    buildForm() {

        for (const name of this.forbiddenNames) {

            // if the user is already member of the project
            // add the email to the list of existing
            this.existingNames.push(
                // new RegExp('^' + name + '\z')
                new RegExp(name)
            );
        }

        this.ontologyLabel = this.project.shortname + ' ontology (data model): ';

        this.ontologyForm = this._fb.group({
            name: new FormControl({
                value: '', disabled: false
            }, [
                Validators.required,
                Validators.minLength(this.nameMinLength),
                Validators.maxLength(this.nameMaxLength),
                existingNamesValidator(this.existingNames),
                Validators.pattern(this.nameRegex)
            ]),
            label: new FormControl({
                value: this.ontologyLabel, disabled: true
            })
        });

        this.ontologyForm.valueChanges.subscribe(data => this.onValueChanged(data));
    }

    onValueChanged(data?: any) {

        if (!this.ontologyForm) {
            return;
        }

        this.ontologyLabel = this.project.shortname + ' ontology (data model): ' + data.name;

        Object.keys(this.formErrors).map(field => {
            this.formErrors[field] = '';
            const control = this.ontologyForm.get(field);
            if (control && control.dirty && !control.valid) {
                const messages = this.validationMessages[field];
                Object.keys(control.errors).map(key => {
                    this.formErrors[field] += messages[key] + ' ';
                });

            }
        });

    }

    createOntology() {
        this.loading = true;

        // const something: number = Math.floor(Math.random() * Math.floor(9999));

        const ontologyData: NewOntology = {
            projectIri: this.project.id,
            name: this.ontologyForm.controls['name'].value,
            label: this.ontologyLabel
        };
        this._ontologyService.createOntology(ontologyData).subscribe(
            (ontology: any) => {

                // set cache for the new ontology
                this._cache.get('currentOntology', this._ontologyService.getAllEntityDefinitionsForOntologies(ontology['@id']));

                // this.updateParent.emit(ontology['@id']);

                this.closeDialog.emit();

                // go to correct route
                const goto = 'project/' + this.projectcode + '/ontologies/' + encodeURIComponent(ontology['@id']);
                this._router.navigate([goto]);

            },
            (error: any) => {
                // in case of an error... e.g. because the ontolog iri is not unique, rebuild the form including the error message

                this.formErrors['name'] += this.validationMessages['name']['existingName'] + ' ';
                this.loading = false;

                console.error(error);
            }
        );
    }

    /**
     * Reset the form
     */
    resetForm(ev: Event, sourceType?: any) {

        this.ontologyLabel = this.project.shortname + ' ontology (data model): ';

        this.buildForm();

    }

}
